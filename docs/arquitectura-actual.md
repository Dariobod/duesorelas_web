# Due Sorelas — arquitectura actual

Fecha de revisión: 2026-08-22

## Resumen

Due Sorelas es una aplicación React/Vite publicada en Cloudflare Workers. El Worker sirve los assets compilados de `dist` y expone una API same-origin. Los productos se almacenan en Cloudflare D1 y las imágenes se sirven desde Cloudinary.

## Componentes

| Componente | Tecnología | Responsabilidad |
| --- | --- | --- |
| UI | React 19 + TypeScript | Home, categorías, detalle y backoffice `/admin` |
| Build | Vite + TypeScript | Compila la aplicación a `dist` |
| Runtime | Cloudflare Workers | Sirve assets y ejecuta la API |
| Base | Cloudflare D1/SQLite | Categorías, productos e imágenes |
| Media | Cloudinary | URLs optimizadas para imágenes |
| Versionado | GitHub, rama `main` | Fuente y auditoría de cambios |
| Deploy | Cloudflare Workers Builds | Build y despliegue automático desde GitHub |

Configuración principal: `wrangler.jsonc`. El binding D1 es `DB` y el binding de assets es `ASSETS`. El fallback SPA permite rutas directas como `/categorias/collares`, `/productos/...` y `/admin`.

## Flujo de una visita pública

1. El navegador solicita una ruta al Worker.
2. El Worker resuelve `/api/products` o `/api/categories`; si no es API, delega en `ASSETS`.
3. La API consulta D1 con statements parametrizados.
4. El frontend transforma los datos de D1 al modelo visual y usa las URLs seguras de Cloudinary.
5. Si la API no responde, el frontend conserva un catálogo local de respaldo.

## Endpoints actuales

| Método | Ruta | Auth | Respuesta |
| --- | --- | --- | --- |
| GET | `/api/products` | Pública | Productos activos, categoría e imágenes |
| GET | `/api/categories` | Pública | Categorías |
| POST | `/api/admin/login` | Pública | Crea cookie de sesión si la contraseña coincide |
| POST | `/api/admin/logout` | Cookie opcional | Invalida la cookie en el navegador |
| GET | `/api/admin/products` | `ds_admin` | Catálogo completo para administración |
| POST | `/api/admin/products` | `ds_admin` | Crea un producto |
| PUT | `/api/admin/products` | `ds_admin` | Actualiza un producto e imágenes |
| GET | `/api/admin/categories` | `ds_admin` | Categorías para el formulario |

Los endpoints admin reciben JSON con: `title`, `selection`, `category`, `description`, `materials`, `measurements`, `price_note`, `price_ars`, `image_1` e `image_2`.

## Modelo D1

- `categories`: `id`, `slug`, `name`.
- `products`: título, slug, descripción, categoría, selección/destacado, materiales, medidas, precio ARS, comentario de precio y estado.
- `product_images`: producto, URL/object key, texto alternativo, orden e indicador de imagen principal.

Migraciones relevantes: `migrations/0001_initial.sql` a `0005_cloudinary_urls.sql`. El catálogo actual contiene 64 productos, 5 categorías y 64 imágenes.

## Despliegue

1. Cambios locales.
2. `npm.cmd run build`.
3. Commit en `main`.
4. Push desde GitHub Desktop/PowerShell.
5. Cloudflare Workers Builds ejecuta el build y crea una versión.

Los secretos `ADMIN_PASSWORD` y `SESSION_SECRET` deben existir como **Runtime Secret** en Production. Nunca deben entrar al repositorio.

## Upload de imagenes a Cloudinary

El backoffice genera una firma temporal en el Worker y sube las imagenes directamente a Cloudinary dentro de la carpeta due-sorelas/products. La secure_url recibida se guarda en D1 al guardar el producto o la categoria.

Variables requeridas en Production: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.
## Límites actuales
