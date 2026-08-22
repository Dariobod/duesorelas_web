export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
}

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', ...(init.headers || {}) },
  });

const encode = (value: string) => btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
const decode = (value: string) => atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4))
const decodeBytes = (value: string) => Uint8Array.from(decode(value), (char) => char.charCodeAt(0))

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  return encode(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))))
}

async function verify(value: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  return crypto.subtle.verify('HMAC', key, decodeBytes(signature), new TextEncoder().encode(value))
}

async function readJson<T>(request: Request, maxBytes = 64 * 1024): Promise<T> {
  const length = Number(request.headers.get('content-length') || 0)
  if (length > maxBytes) throw new Error('body_too_large')
  const bytes = new Uint8Array(await request.arrayBuffer())
  if (bytes.byteLength > maxBytes) throw new Error('body_too_large')
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}

function validText(value: unknown, max: number) { return typeof value === 'string' && value.length <= max }
function sameOrigin(request: Request) { const origin = request.headers.get('origin'); return !origin || origin === new URL(request.url).origin }

async function isAdmin(request: Request, env: Env) {
  const raw = request.headers.get('Cookie')?.match(/(?:^|; )__Host-ds_admin=([^;]+)/)?.[1]
  if (!raw) return false
  const [payload, signature] = raw.split('.')
  if (!payload || !signature) return false
  if (!(await verify(payload, signature, env.SESSION_SECRET))) return false
  try { return Number(JSON.parse(decode(payload)).expiresAt) > Date.now() } catch { return false }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/admin/login' && request.method === 'POST') {
      if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return json({ error: 'Configuración de secretos incompleta' }, { status: 500 });
      if (!sameOrigin(request)) return json({ error: 'Origen no permitido' }, { status: 403 });
      let body: { password?: string };
      try { body = await readJson(request, 16 * 1024); } catch { return json({ error: 'Solicitud inválida' }, { status: 400 }); }
      if (!body.password || body.password !== env.ADMIN_PASSWORD) return json({ error: 'Credenciales inválidas' }, { status: 401 });
      const payload = encode(JSON.stringify({ expiresAt: Date.now() + 1000 * 60 * 60 * 8 }));
      const signature = await sign(payload, env.SESSION_SECRET);
      return json({ ok: true }, { headers: { 'cache-control': 'no-store', 'set-cookie': `__Host-ds_admin=${payload}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800` } });
    }

    if (url.pathname === '/api/admin/logout' && request.method === 'POST') {
      return json({ ok: true }, { headers: { 'cache-control': 'no-store', 'set-cookie': '__Host-ds_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0' } });
    }

    if (url.pathname === '/api/admin/products') {
      if (!(await isAdmin(request, env))) return json({ error: 'No autorizado' }, { status: 401 });
      if (request.method === 'GET') {
        const result = await env.DB.prepare(`SELECT p.id,p.slug,p.title,p.description,p.materials,p.measurements,p.price_ars,p.price_note,p.selection,p.featured,p.active,c.slug AS category_slug,c.name AS category_name,COALESCE((SELECT json_group_array(pi.object_key) FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.sort_order),'[]') AS images FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.id`).all();
        return json(result.results.map((product) => ({ ...product, images: JSON.parse(String(product.images || '[]')) })), { headers: { 'cache-control': 'no-store, private' } });
      }
      if (request.method === 'POST' || request.method === 'PUT') {
        try {
        if (!sameOrigin(request)) return json({ error: 'Origen no permitido' }, { status: 403 });
        let body: { id?: number; title: string; selection?: boolean; active?: boolean; category: string; description?: string; materials?: string; measurements?: string; price_note?: string; price_ars: number; image_1?: string; image_2?: string };
        try { body = await readJson(request); } catch { return json({ error: 'Solicitud inválida' }, { status: 400 }); }
        if (!validText(body.title, 160) || !validText(body.category, 80) || !validText(body.description || '', 5000) || !validText(body.materials || '', 500) || !validText(body.measurements || '', 300) || !validText(body.price_note || '', 500)) return json({ error: 'Campos inválidos' }, { status: 400 });
        if (!Number.isInteger(Number(body.price_ars)) || Number(body.price_ars) < 0 || Number(body.price_ars) > 100000000) return json({ error: 'Precio inválido' }, { status: 400 });
        const imageValues = [body.image_1, body.image_2].filter(Boolean);
        if (imageValues.some((image) => !validText(image, 1000) || !image.startsWith('https://res.cloudinary.com/'))) return json({ error: 'Imagen inválida' }, { status: 400 });
        const slug = body.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + (body.id ? `-${body.id}` : '');
        const category = await env.DB.prepare('SELECT id FROM categories WHERE slug=?').bind(body.category).first<{ id: number }>();
        if (!category) return json({ error: 'Categoría inválida' }, { status: 400 });
        const statement = body.id
          ? env.DB.prepare('UPDATE products SET title=?,slug=?,description=?,category_id=?,selection=?,featured=?,active=?,materials=?,measurements=?,price_ars=?,price_note=?,updated_at=datetime(\'now\') WHERE id=?').bind(body.title, slug, body.description || '', category.id, body.selection ? 's' : 'n', body.selection ? 1 : 0, body.active === false ? 0 : 1, body.materials || '', body.measurements || '', Number(body.price_ars) || 0, body.price_note || '', body.id)
          : env.DB.prepare('INSERT INTO products (title,slug,description,category_id,selection,featured,materials,measurements,price_ars,price_note) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(body.title, slug, body.description || '', category.id, body.selection ? 's' : 'n', body.selection ? 1 : 0, body.materials || '', body.measurements || '', Number(body.price_ars) || 0, body.price_note || '');
        const result = await statement.run();
        const id = body.id || result.meta.last_row_id;
        const images = [body.image_1, body.image_2].filter(Boolean);
        const imageStatements = images.map((image, index) => env.DB.prepare('INSERT INTO product_images (product_id,object_key,alt_text,sort_order,is_primary) VALUES (?,?,?,?,?)').bind(id, image, body.title, index, index === 0 ? 1 : 0));
        await env.DB.prepare('DELETE FROM product_images WHERE product_id=?').bind(id).run();
        for (const imageStatement of imageStatements) await imageStatement.run();
        return json({ ok: true, id }, { headers: { 'cache-control': 'no-store, private' } });
        } catch (error) {
          console.error('admin product save failed', error);
          return json({ error: 'No se pudo guardar el producto', detail: error instanceof Error ? error.message : String(error) }, { status: 500, headers: { 'cache-control': 'no-store, private' } });
        }
      }
    }

    if (url.pathname.startsWith('/api/admin/products/') && (await isAdmin(request, env))) {
      const id = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(id) || id <= 0) return json({ error: 'Producto inválido' }, { status: 400 });
      if (request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
        return json({ ok: true }, { headers: { 'cache-control': 'no-store, private' } });
      }
    }

    if (url.pathname === '/api/admin/categories' && (await isAdmin(request, env))) {
      const result = await env.DB.prepare('SELECT slug,name FROM categories ORDER BY name').all();
      return json(result.results, { headers: { 'cache-control': 'no-store, private' } });
    }

    if (url.pathname === '/api/categories') {
      const result = await env.DB.prepare(
        'SELECT id, slug, name FROM categories ORDER BY name',
      ).all();
      return json(result.results);
    }

    if (url.pathname === '/api/products') {
      const result = await env.DB.prepare(`
        SELECT p.id, p.slug, p.title, p.description, p.materials,
          p.measurements, p.price_ars, p.price_note, p.active,
          c.slug AS category_slug, c.name AS category_name,
          COALESCE((
            SELECT json_group_array(json_object(
              'url', pi.object_key,
              'alt', pi.alt_text,
              'sortOrder', pi.sort_order,
              'isPrimary', pi.is_primary
            ))
            FROM product_images pi
            WHERE pi.product_id = p.id
          ), '[]') AS images
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE p.active = 1
        ORDER BY p.id
      `).all();

      const products = result.results.map((product) => ({
        ...product,
        priceArs: product.price_ars,
        category: product.category_slug,
        images: JSON.parse(String(product.images || '[]')),
      }));
      return json(products, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300' } });
    }

    return env.ASSETS.fetch(request);
  },
};
