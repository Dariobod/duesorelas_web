# Auditoría inicial de seguridad y resiliencia

Fecha: 2026-08-22

## Alcance y método

Revisión defensiva del código del Worker, frontend, configuración de Wrangler, migraciones, dependencias y flujo de despliegue. No se ejecutaron ataques destructivos, fuzzing contra producción ni pruebas de saturación real. La prueba de carga debe hacerse sobre un entorno aislado y con autorización explícita.

## Hallazgos preliminares

### Alto — backoffice sin protección contra fuerza bruta

`POST /api/admin/login` compara la contraseña, pero no tiene rate limiting, backoff, bloqueo, CAPTCHA ni auditoría. Un atacante puede automatizar intentos contra el endpoint.

**Mitigación:** aplicar Rate Limiting/WAF a `/api/admin/login`, limitar intentos por IP y, preferentemente, proteger `/admin` con Cloudflare Access o un proveedor de identidad. Agregar alertas y logs sin registrar contraseñas.

### Alto — upload de Cloudinary unsigned

El preset `duesorelas_unsigned` permite cargas directas con una credencial pública de preset. Si se expone en el frontend, terceros podrían subir contenido y consumir la cuota.

**Mitigación:** usar cargas firmadas generadas por el Worker, validar MIME, extensión, tamaño y cantidad; limitar carpeta/prefijo y configurar políticas de Cloudinary.

### Medio — contraseña de administración compartida

El esquema actual usa una única contraseña almacenada como secret. No hay usuarios, roles, rotación, recuperación ni MFA.

**Mitigación:** Cloudflare Access para el panel o identidad basada en email con MFA. Como mínimo, rotar `ADMIN_PASSWORD`, usar un secreto largo y mantener `SESSION_SECRET` independiente.

### Medio — ausencia de cabeceras de seguridad

El Worker no establece explícitamente CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` ni una política de frame. HSTS debe activarse cuando el dominio final esté correctamente en HTTPS.

**Mitigación:** añadir cabeceras en respuestas de assets y API; definir una CSP compatible con Cloudinary, Google Fonts y el video usado.

### Medio — falta de validación de entrada en CRUD

Los endpoints admin aceptan títulos, textos, precios, URLs e imágenes sin límites explícitos de longitud, formato o cantidad. Las consultas SQL están parametrizadas, por lo que no se observa inyección SQL directa.

**Mitigación:** validar esquema con límites (por ejemplo, título, descripción, precio entero no negativo, URLs HTTPS de Cloudinary), rechazar cuerpos grandes y normalizar categorías contra una lista permitida.

### Medio — falta de protección específica contra CSRF/origen

La cookie usa `HttpOnly`, `Secure` y `SameSite=Lax`, lo que reduce riesgo. No hay comprobación explícita de `Origin`/`Referer` ni token CSRF para mutaciones.

**Mitigación:** validar `Origin` para POST/PUT, usar `SameSite=Strict` si el flujo lo permite y añadir CSRF token si se incorporan dominios o flujos cross-site.

### Bajo — endpoints públicos sin caché ni límites de consulta

`GET /api/products` devuelve todo el catálogo y consulta D1 en cada llamada. No hay `Cache-Control`, ETag, paginación ni límite de campos.

**Mitigación:** cachear respuestas públicas en Cloudflare, añadir paginación/filtros acotados e índices; mantener admin fuera de cache.

### Bajo — dependencias y auditoría de cadena de suministro

El build local pasa. `npm audit` no pudo consultar el registro por un error de certificado de la máquina, por lo que no se considera una auditoría de vulnerabilidades de dependencias concluyente.

**Mitigación:** ejecutar `npm audit` en CI con red confiable, fijar lockfile, activar Dependabot/Renovate y revisar cambios de dependencias.

## Resiliencia ante alto volumen

Cloudflare ofrece protección DDoS administrada en todos los planes y la red absorbe ataques volumétricos de capas 3–7. Eso no equivale a rate limiting de la aplicación. En Workers Free existe un límite diario de 100.000 requests; al alcanzarlo, el Worker puede devolver error 1027 o aplicar el modo configurado. D1 procesa cada base de forma single-threaded: consultas lentas o muchas escrituras forman cola y pueden devolver errores al superar límites.

En el estado actual, una oleada contra `/api/products` puede multiplicar lecturas D1 porque no hay cache. Una oleada contra `/api/admin/login` puede consumir CPU y probar contraseñas porque no hay rate limit. Cloudinary también puede recibir cargas abusivas si se deja unsigned upload expuesto.

## Plan de endurecimiento priorizado

1. Proteger `/admin` con Cloudflare Access o rate limiting + MFA.
2. Implementar rate limiting específico para login y mutaciones admin.
3. Migrar a Cloudinary signed uploads y validar archivos.
4. Añadir validación de entrada, límites de body y cabeceras de seguridad.
5. Añadir `Cache-Control`/cache edge para GET públicos y paginación.
6. Activar métricas, alertas y logs sin secretos.
7. Ejecutar pruebas de carga controladas en staging, no contra producción.
8. Repetir auditoría antes de conectar el dominio propio.

## Conclusión

La arquitectura es apropiada para un catálogo pequeño y el perímetro Cloudflare ofrece una base sólida contra DDoS volumétrico. El riesgo principal actual no es la página estática, sino el nuevo backoffice: autenticación de contraseña única, ausencia de rate limiting y carga Cloudinary unsigned. Esos controles deben implementarse antes de usar el panel en producción.
