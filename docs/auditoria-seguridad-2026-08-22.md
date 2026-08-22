# Auditoría defensiva de seguridad — Due Sorelas

**Fecha:** 2026-08-22  
**Alcance:** revisión estática del repositorio, configuración de Wrangler, Worker/API, frontend de administración y dependencias declaradas. Se ejecutó `npm.cmd run build` correctamente. No se ejecutó un ataque contra producción ni una prueba de carga destructiva.

## Resumen ejecutivo

La aplicación está bien encaminada para una demo y un catálogo pequeño: usa consultas D1 parametrizadas, secretos de Cloudflare para el acceso administrativo, cookies `HttpOnly`/`Secure` y React escapa el contenido mostrado. Sin embargo, el backoffice todavía no debe considerarse listo para producción sin controles adicionales.

Los riesgos principales son:

1. **Alto — login sin rate limiting ni bloqueo:** `/api/admin/login` acepta intentos ilimitados. Un atacante podría hacer password spraying o fuerza bruta.
2. **Alto — autorización basada en una contraseña compartida:** no hay usuarios, MFA, recuperación, auditoría ni rotación integrada. Si se filtra `ADMIN_PASSWORD`, se obtiene control del catálogo.
3. **Medio — endpoints de escritura sin límites de tamaño ni validación robusta:** un cuerpo JSON grande o valores inválidos pueden provocar errores, consumo innecesario o datos corruptos.
4. **Medio — respuestas administrativas sin `Cache-Control: no-store`:** una regla de caché mal configurada podría almacenar datos del backoffice.
5. **Medio — consultas públicas sin caché/paginación:** cada visita ejecuta consultas D1 y una subconsulta de imágenes por producto; frente a tráfico alto, el cuello de botella será D1 y el Worker, aunque Cloudflare absorba gran parte del tráfico de red.
6. **Bajo/medio — URLs de imagen aceptadas sin política de origen:** el administrador puede guardar cualquier URL. Conviene aceptar únicamente URLs HTTPS de Cloudinary y validar tipo/tamaño durante la carga.

No se encontraron indicios de SQL injection en el Worker: los valores recibidos se pasan mediante `.bind(...)`. Tampoco se observó uso de `eval`, `innerHTML` o secretos privados en el frontend.

## Arquitectura observada

```text
Navegador
  ├─ React/Vite (assets estáticos)
  ├─ GET /api/products ──────┐
  ├─ GET /api/categories ────┤── Cloudflare Worker
  └─ /admin                  │       ├─ D1: productos/categorías/imágenes
                             │       └─ ASSETS: dist/
                             └─ Cloudinary: URLs de imágenes (el navegador las solicita directamente)
```

Configuración relevante en `wrangler.jsonc`: Worker `worker/index.ts`, binding D1 `DB`, binding de assets `ASSETS` y fallback SPA. `ADMIN_PASSWORD` y `SESSION_SECRET` deben existir como **Runtime Secrets en Production**, nunca en el repositorio.

## Inventario de endpoints

| Método | Ruta | Público | Función | Riesgos/controles actuales |
|---|---|---:|---|---|
| `POST` | `/api/admin/login` | Sí | Compara la contraseña y emite cookie firmada de 8 horas | Sin rate limit, sin límite de body, sin MFA; responde 401 genérico |
| `POST` | `/api/admin/logout` | Sí | Borra cookie | No requiere sesión; impacto bajo |
| `GET` | `/api/admin/products` | No | Lista el catálogo para el backoffice | Cookie HMAC; sin paginación ni `no-store` |
| `POST` | `/api/admin/products` | No | Crea un producto y sus imágenes | Validación de entrada limitada; varias escrituras sin transacción |
| `PUT` | `/api/admin/products` | No | Edita un producto y reemplaza imágenes | Igual que POST; no hay control de concurrencia |
| `GET` | `/api/admin/categories` | No | Lista categorías | Cookie HMAC; sin `no-store` |
| `GET` | `/api/categories` | Sí | Lista categorías públicas | Consulta pequeña; puede cachearse |
| `GET` | `/api/products` | Sí | Lista todos los productos activos e imágenes | Sin caché/paginación; consulta agregada por producto |
| cualquier otro | — | Sí | Sirve `ASSETS` | Fallback SPA; validar que no se expongan archivos auxiliares en una futura configuración |

## Hallazgos detallados

### H-01 — Fuerza bruta contra el login (Alto)

**Evidencia:** `worker/index.ts:36-42` procesa cualquier `POST` y compara `body.password` sin contador, demora progresiva, CAPTCHA, rate limit ni bloqueo.

**Impacto:** un atacante puede automatizar intentos contra `ADMIN_PASSWORD`. Cloudflare protege disponibilidad de red, pero no impide que miles de requests válidos lleguen al endpoint.

**Mitigación prioritaria:** aplicar Rate Limiting Rule específica para `POST /api/admin/login` (por IP y, si es posible, por combinación IP/ruta), por ejemplo un umbral conservador; responder `429` con `Retry-After`. Añadir un límite de intentos en Durable Object/KV si se necesita control distribuido. Preferir Cloudflare Access/Zero Trust con MFA para `/admin` y eliminar la contraseña compartida.

### H-02 — Modelo de identidad administrativo débil (Alto)

**Evidencia:** `Env` contiene una única `ADMIN_PASSWORD`; la autenticación es una comparación directa (`worker/index.ts:38-39`).

**Impacto:** no hay separación de roles, revocación por usuario, MFA, registro de accesos o rotación sencilla. Comprometer el secreto otorga todas las operaciones disponibles.

**Mitigación:** para producción, proteger `/admin` y `/api/admin/*` con Cloudflare Access (Google/GitHub/email OTP + MFA) y mantener una segunda autorización en el Worker. Como mínimo, migrar a un hash de contraseña con KDF fuera del request o un proveedor de identidad; añadir rotación, sesión revocable y auditoría.

### M-01 — Validación y límites de entrada insuficientes (Medio)

**Evidencia:** `request.json()` se procesa sin `Content-Length`/límite de bytes (`worker/index.ts:38,56`); `body.title.toLowerCase()` se ejecuta sin comprobar tipo (`:57`); precio, textos, cantidad de imágenes y longitud de URLs no tienen límites.

**Impacto:** cuerpos grandes pueden consumir memoria/CPU; JSON inválido produce 500; datos excesivos contaminan D1 y dificultan operación. El front-end valida poco y no es una frontera de seguridad.

**Mitigación:** implementar `readJsonWithLimit(request, 64 * 1024)`, validar forma y tipos, límites por campo (título/descripción/URL), precio entero no negativo con máximo razonable, máximo dos imágenes, URL `https` de `res.cloudinary.com`. Responder `400` sin stack traces.

### M-02 — Escrituras no transaccionales (Medio)

**Evidencia:** se actualiza/inserta `products`, luego se hace `DELETE` y múltiples `INSERT` de imágenes (`worker/index.ts:60-67`) sin batch/transacción.

**Impacto:** un error entre operaciones puede dejar el producto sin imágenes o con una galería incompleta. Reintentos pueden producir estados inconsistentes.

**Mitigación:** usar `env.DB.batch([...])` para agrupar las operaciones y una estrategia idempotente; validar el ID y controlar concurrencia con `updated_at`/versión.

### M-03 — Falta de cabeceras de privacidad y seguridad (Medio)

**Evidencia:** helper `json()` solo establece `content-type` (`worker/index.ts:8-12`). No se envía `Cache-Control: no-store` en respuestas administrativas ni cabeceras defensivas globales.

**Impacto:** una configuración futura de caché podría almacenar respuestas administrativas; faltan CSP, `X-Content-Type-Options`, `Referrer-Policy` y una política explícita de permisos.

**Mitigación:** respuestas `/api/admin/*`: `Cache-Control: no-store, private`; globalmente: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva y CSP compatible con Cloudinary/Pexels. Confirmar CSP en staging para no romper el video.

### M-04 — Superficie de disponibilidad: D1 sin caché/paginación (Medio)

**Evidencia:** `/api/products` ejecuta una consulta completa y una subconsulta `json_group_array` de imágenes para cada producto (`worker/index.ts:84-111`).

**Impacto:** el catálogo actual es pequeño, pero el costo por request crece con productos/imágenes. Un volumen alto de requests puede agotar CPU/subrequests o límites operativos de D1 antes que Cloudflare bloquee el tráfico.

**Mitigación:** cachear respuesta pública con `caches.default` o `Cache-Control` de corta duración; invalidar tras guardar un producto; agregar `?category`, `?page`, `?limit` con máximos; mantener índices en `active`, `category_id` y `product_id`; considerar una respuesta pre-renderizada para el catálogo público.

### M-05 — URLs de imágenes sin allowlist (Medio/bajo)

**Evidencia:** `image_1` e `image_2` se aceptan y persisten sin validación (`worker/index.ts:56,65-67`).

**Impacto:** un operador comprometido o un error puede guardar URLs de tracking, contenido no confiable o recursos externos lentos. El navegador no ejecuta normalmente `javascript:` en un `<img>`, pero la política de origen debe ser explícita.

**Mitigación:** aceptar solo `https://res.cloudinary.com/nflmt6xk/…` (o el cloud name configurado), normalizar URLs, validar extensión/tipo y usar carga directa de Cloudinary con preset seguro o firma del Worker.

### L-01 — Comparación de firma no constante en tiempo (Bajo)

**Evidencia:** `expected !== signature` (`worker/index.ts:27-29`).

**Impacto:** potencial canal de timing; difícil de explotar a través de Internet y la firma tiene 256 bits, pero es mejor usar `crypto.subtle.verify`.

**Mitigación:** conservar el payload y usar `crypto.subtle.verify('HMAC', key, receivedSignature, data)` con decodificación segura. Migrar la cookie a prefijo `__Host-ds_admin` y añadir `Path=/; Secure; HttpOnly; SameSite=Strict` si no se requiere navegación cross-site.

### L-02 — Errores de JSON sin manejo explícito (Bajo)

**Evidencia:** `request.json()` no está envuelto en `try/catch` (`worker/index.ts:38,56`).

**Mitigación:** devolver `400 JSON inválido`; no exponer detalles de excepciones.

## Alto volumen, abuso y disponibilidad

### Qué protege Cloudflare actualmente

Workers se ejecuta en la red perimetral y Cloudflare ofrece mitigación de DDoS de red en su plataforma. Eso ayuda mucho frente a inundaciones volumétricas, pero **no equivale a protección completa contra abuso de aplicación**. Requests HTTP bien formados pueden seguir llegando al Worker y consumir CPU, D1 y límites del plan.

### Riesgos concretos en esta aplicación

- `/api/admin/login`: costo bajo por request, pero fuerza bruta ilimitada.
- `/api/products`: costo de D1 proporcional al catálogo; sin caché, cada request consulta la base.
- `/api/admin/products`: lecturas/escrituras autenticadas; sin rate limit ni límites de body.
- Cloudinary recibe imágenes directamente solo cuando se implemente la carga desde el backoffice; debe tener límites de formato/tamaño y un preset restringido.

### Prueba de carga segura recomendada

No ejecutar un flood contra la URL pública. Crear staging/preview y acordar un umbral. Usar `k6` o `wrk` con carga gradual (por ejemplo 1, 5, 10 y 25 RPS durante 60 s), detenerse ante errores o latencia creciente, medir p50/p95/p99, 2xx/4xx/5xx, CPU del Worker, consultas D1 y límites de Cloudinary. Antes, aplicar rate limits para no convertir la prueba en indisponibilidad accidental.

## Plan de mitigación priorizado

### Antes de exponer el dominio propio

1. Rate limit al login y a endpoints administrativos.
2. Cloudflare Access + MFA para `/admin`.
3. Límites y validación de todos los cuerpos JSON.
4. Transacción/batch para guardar producto e imágenes.
5. `no-store` y cabeceras defensivas.
6. Caché pública corta + paginación/filtros.
7. Allowlist de URLs Cloudinary.
8. Revisar secretos Runtime Production, rotarlos y verificar que no estén en Git.

### Después

1. Auditoría de dependencias automatizada (`npm audit`/Dependabot) en CI.
2. Logs y métricas de errores sin registrar contraseñas, cookies ni tokens.
3. Backups/export de D1 y procedimiento de restauración.
4. Test de carga controlado en staging.
5. Revisión de CSP, CORS y dominios al conectar `duesorelas.com.ar`.
6. Prueba de seguridad manual posterior a cada cambio del backoffice.

## Limitaciones de esta auditoría

- No se recibieron credenciales ni se intentó acceder a Cloudflare, D1, Cloudinary o GitHub.
- No se ejecutó explotación activa ni fuzzing contra producción.
- `npm audit` no pudo consultar el registro en este entorno por un error de verificación TLS del certificado; debe repetirse en CI o una máquina con conexión npm confiable.
- La auditoría cubre el estado del repositorio al 2026-08-22 y debe repetirse después de implementar las mitigaciones.

