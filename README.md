# Due Sorelas

Frontend inicial para catálogo de bijouterie, creado con React, TypeScript y Vite. Es un sitio estático compatible con Cloudflare Pages.

## Ejecutar localmente

```bash
npm install
npm run dev
```

## Rutas incluidas....1

- `/` — portada y categorías.
- `/categorias/:slug` — listado por rubro.
- `/productos/:slug` — detalle de producto y consulta por WhatsApp.

## Datos y próximos pasos

- Los datos están hardcodeados y tipados en `src/data/catalog.ts` para que luego sea simple sustituirlos por una API o CMS.
- El número de consulta está centralizado en `whatsappUrl`.
- Las imágenes locales son recursos de demostración generados para esta primera versión. El video es un recurso de demostración de Pexels y debe sustituirse por un video propio servido desde Cloudinary antes de publicar.
- La guía de análisis, decisiones y bitácora se conserva en `docs/` y `project-context/`.

## Publicar en Cloudflare Pages

1. Subir este repositorio a GitHub.
2. En Cloudflare Pages, crear un proyecto conectado al repositorio.
3. Elegir el preset **Vite**.
4. Definir `npm run build` como comando y `dist` como directorio de salida.
5. Configurar una regla SPA (`/* → /index.html`) si se publica con rutas directas de React Router.
# Due Sorelas Web

<!-- Prueba de sincronizacion automatica -->
<!-- Flujo verificado: commit local y despliegue remoto -->

<!-- Verificación del flujo GitHub → Cloudflare Workers -->

## Upload de imagenes a Cloudinary

El backoffice permite seleccionar imagenes desde la computadora. El Worker genera una firma segura y Cloudinary devuelve la secure_url, que luego queda guardada en D1 al guardar el producto o la categoria.

En Cloudflare Production configurar:
- CLOUDINARY_CLOUD_NAME como variable de entorno.
- CLOUDINARY_API_KEY como Runtime Secret.
- CLOUDINARY_API_SECRET como Runtime Secret.
