export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
}

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });

const encode = (value: string) => btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
const decode = (value: string) => atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4))

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  return encode(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))))
}

async function isAdmin(request: Request, env: Env) {
  const raw = request.headers.get('Cookie')?.match(/(?:^|; )ds_admin=([^;]+)/)?.[1]
  if (!raw) return false
  const [payload, signature] = raw.split('.')
  if (!payload || !signature) return false
  const expected = await sign(payload, env.SESSION_SECRET)
  if (expected !== signature) return false
  try { return Number(JSON.parse(decode(payload)).expiresAt) > Date.now() } catch { return false }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/admin/login' && request.method === 'POST') {
      if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return json({ error: 'Configuración de secretos incompleta' }, { status: 500 });
      const body = await request.json<{ password?: string }>();
      if (!body.password || body.password !== env.ADMIN_PASSWORD) return json({ error: 'Credenciales inválidas' }, { status: 401 });
      const payload = encode(JSON.stringify({ expiresAt: Date.now() + 1000 * 60 * 60 * 8 }));
      const signature = await sign(payload, env.SESSION_SECRET);
      return json({ ok: true }, { headers: { 'set-cookie': `ds_admin=${payload}.${signature}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800` } });
    }

    if (url.pathname === '/api/admin/logout' && request.method === 'POST') {
      return json({ ok: true }, { headers: { 'set-cookie': 'ds_admin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' } });
    }

    if (url.pathname === '/api/admin/products') {
      if (!(await isAdmin(request, env))) return json({ error: 'No autorizado' }, { status: 401 });
      const result = await env.DB.prepare(`SELECT p.id,p.slug,p.title,p.price_ars,p.active,c.name AS category_name FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.id`).all();
      return json(result.results);
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
      return json(products);
    }

    return env.ASSETS.fetch(request);
  },
};
