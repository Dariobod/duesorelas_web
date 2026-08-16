# Decisión: stack inicial y publicación

Fecha: 16 de agosto de 2026

## Elegido

React + TypeScript + Vite, con CSS propio y React Router. La primera versión es estática y se prepara para Cloudflare Pages.

## Motivo

Permite una experiencia de catálogo fluida y responsive hoy, y desacopla la presentación de la futura fuente de datos. Cloudflare Pages puede construir Vite con `npm run build` y servir el directorio `dist` de forma gratuita.

## Integraciones futuras

- Productos: reemplazar `src/data/catalog.ts` por un repositorio que consulte API/CMS.
- Media: mover imágenes y video a Cloudinary; conservar URLs en los datos de producto.
- Operación: definir el backoffice una vez conocidas la cantidad de productos, roles y flujo de carga.

