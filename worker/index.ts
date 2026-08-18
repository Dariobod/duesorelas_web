export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

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
