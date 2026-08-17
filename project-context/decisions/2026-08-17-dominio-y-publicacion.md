# Decisión: dominio propio al final del desarrollo

Fecha: 17 de agosto de 2026

## Decisión

El dominio `duesorelas.com.ar` no se conectará todavía. Durante el desarrollo se utilizarán el entorno local y una URL temporal de Cloudflare para previews.

## Motivo

Evita tocar DNS o exponer el dominio antes de validar diseño, navegación, catálogo, backend y media. La conexión final se hará cuando exista una versión aprobada.

## Plan de conexión final

1. Publicar la versión estable en Cloudflare.
2. Conectar `duesorelas.com.ar` y `www.duesorelas.com.ar`.
3. Verificar HTTPS, redirecciones y rutas de React.
4. Conectar un subdominio independiente para media, por ejemplo `media.duesorelas.com.ar`, si se utiliza R2.
5. Revisar que WhatsApp, imágenes, videos y SEO funcionen con el dominio final.
