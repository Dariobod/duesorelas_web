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
const defaultContent = { hero_image: '/assets/hero-due-sorelas.png', craft_video: 'https://videos.pexels.com/video-files/6263745/6263745-sd_360_640_25fps.mp4' }

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
      try {
        const signature = await sign(payload, env.SESSION_SECRET);
        return json({ ok: true }, { headers: { 'cache-control': 'no-store', 'set-cookie': `__Host-ds_admin=${payload}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800` } });
      } catch (error) {
        console.error('admin login signing failed', error);
        return json({ error: 'No se pudo iniciar sesión' }, { status: 500, headers: { 'cache-control': 'no-store, private' } });
      }
    }

    if (url.pathname === '/api/admin/logout' && request.method === 'POST') {
      return json({ ok: true }, { headers: { 'cache-control': 'no-store', 'set-cookie': '__Host-ds_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0' } });
    }

    if (url.pathname === '/api/admin/content' && (await isAdmin(request, env))) {
      if (request.method === 'GET') {
        try {
          const result = await env.DB.prepare('SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (?, ?)').bind('home_hero_image', 'home_craft_video').all();
          const values = Object.fromEntries(result.results.map((setting) => [String(setting.setting_key), String(setting.setting_value || '')]));
          return json({ hero_image: values.home_hero_image || defaultContent.hero_image, craft_video: values.home_craft_video || defaultContent.craft_video }, { headers: { 'cache-control': 'no-store, private' } });
        } catch {
          return json(defaultContent, { headers: { 'cache-control': 'no-store, private' } });
        }
      }
      if (request.method === 'PUT') {
        if (!sameOrigin(request)) return json({ error: 'Origen no permitido' }, { status: 403 });
        let body: { hero_image?: string; craft_video?: string };
        try { body = await readJson(request, 16 * 1024); } catch { return json({ error: 'Solicitud inválida' }, { status: 400 }); }
        const heroImage = String(body.hero_image || '').trim();
        const craftVideo = String(body.craft_video || '').trim();
        if (!validText(heroImage, 2000) || !validText(craftVideo, 2000) || (heroImage && heroImage !== defaultContent.hero_image && !heroImage.startsWith('https://')) || (craftVideo && !craftVideo.startsWith('https://'))) return json({ error: 'Las URLs deben ser HTTPS y tener un máximo de 2000 caracteres' }, { status: 400 });
        try {
          await env.DB.batch([
            env.DB.prepare("INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at").bind('home_hero_image', heroImage || defaultContent.hero_image),
            env.DB.prepare("INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at").bind('home_craft_video', craftVideo || defaultContent.craft_video),
          ]);
          return json({ hero_image: heroImage || defaultContent.hero_image, craft_video: craftVideo || defaultContent.craft_video }, { headers: { 'cache-control': 'no-store, private' } });
        } catch (error) {
          console.error('admin content save failed', error);
          return json({ error: 'No se pudo guardar el contenido' }, { status: 500 });
        }
      }
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
      if (request.method === 'GET') {
        try {
          const result = await env.DB.prepare('SELECT id,slug,name,image_url FROM categories ORDER BY name').all();
          return json(result.results, { headers: { 'cache-control': 'no-store, private' } });
        } catch {
          const result = await env.DB.prepare('SELECT id,slug,name FROM categories ORDER BY name').all();
          return json(result.results.map((category) => ({ ...category, image_url: '' })), { headers: { 'cache-control': 'no-store, private' } });
        }
      }
      if (request.method === 'POST' || request.method === 'PUT') {
        if (!sameOrigin(request)) return json({ error: 'Origen no permitido' }, { status: 403 });
        let body: { id?: number; slug: string; name: string; image_url?: string };
        try { body = await readJson(request); } catch { return json({ error: 'Solicitud inválida' }, { status: 400 }); }
        const slug = String(body.slug || '').trim().toLowerCase();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !validText(body.name, 100) || !body.name.trim()) return json({ error: 'Categoría inválida' }, { status: 400 });
        const imageUrl = String(body.image_url || '').trim();
        if (!validText(imageUrl, 1000) || (imageUrl && !imageUrl.startsWith('https://res.cloudinary.com/'))) return json({ error: 'Imagen inválida' }, { status: 400 });
        try {
          if (request.method === 'PUT') {
            if (!Number.isInteger(Number(body.id)) || Number(body.id) <= 0) return json({ error: 'Categoría inválida' }, { status: 400 });
            await env.DB.prepare('UPDATE categories SET slug=?,name=?,image_url=? WHERE id=?').bind(slug, body.name.trim(), imageUrl, Number(body.id)).run();
            return json({ ok: true, id: Number(body.id) }, { headers: { 'cache-control': 'no-store, private' } });
          }
          const result = await env.DB.prepare('INSERT INTO categories (slug,name,image_url) VALUES (?,?,?)').bind(slug, body.name.trim(), imageUrl).run();
          return json({ ok: true, id: result.meta.last_row_id }, { status: 201, headers: { 'cache-control': 'no-store, private' } });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          return json({ error: 'No se pudo guardar la categoría', detail }, { status: 409 });
        }
      }
    }

    if (url.pathname.startsWith('/api/admin/categories/') && (await isAdmin(request, env))) {
      if (request.method === 'DELETE') {
        if (!sameOrigin(request)) return json({ error: 'Origen no permitido' }, { status: 403 });
        const id = Number(url.pathname.split('/').pop());
        if (!Number.isInteger(id) || id <= 0) return json({ error: 'Categoría inválida' }, { status: 400 });
        const products = await env.DB.prepare('SELECT COUNT(*) AS count FROM products WHERE category_id=?').bind(id).first<{ count: number }>();
        if (Number(products?.count || 0) > 0) return json({ error: 'No se puede borrar una categoría con productos' }, { status: 409 });
        await env.DB.prepare('DELETE FROM categories WHERE id=?').bind(id).run();
        return json({ ok: true }, { headers: { 'cache-control': 'no-store, private' } });
      }
    }

    if (url.pathname === '/api/categories') {
      try {
        const result = await env.DB.prepare('SELECT id, slug, name, image_url FROM categories ORDER BY name').all();
        return json(result.results);
      } catch {
        const result = await env.DB.prepare('SELECT id, slug, name FROM categories ORDER BY name').all();
        return json(result.results.map((category) => ({ ...category, image_url: '' })));
      }
    }

    if (url.pathname === '/api/content') {
      try {
        const result = await env.DB.prepare('SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (?, ?)').bind('home_hero_image', 'home_craft_video').all();
        const values = Object.fromEntries(result.results.map((setting) => [String(setting.setting_key), String(setting.setting_value || '')]));
        return json({ heroImage: values.home_hero_image || defaultContent.hero_image, craftVideo: values.home_craft_video || defaultContent.craft_video }, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300' } });
      } catch {
        return json({ heroImage: defaultContent.hero_image, craftVideo: defaultContent.craft_video }, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300' } });
      }
    }
    if (url.pathname === '/api/products') {
      const result = await env.DB.prepare(`
        SELECT p.id, p.slug, p.title, p.description, p.materials,
          p.measurements, p.price_ars, p.price_note, p.featured, p.active,
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
