# Análisis de referencia — PDPAOLA

Fecha: 16 de agosto de 2026  
Fuentes revisadas:

- https://www.pdpaola.com/es
- https://www.pdpaola.com/es/collections/necklaces
- https://www.pdpaola.com/es/products/sodalite-drop-necklace

## Propósito

Tomar como referencia la claridad, composición y experiencia de navegación del sitio, sin copiar su identidad, textos, código ni recursos visuales. Due Sorelas tendrá identidad, contenido y fotografías propios.

## Hallazgos

### Navegación global

- Cabecera muy liviana y fija: menú, marca centrada y utilidades a la derecha en escritorio.
- En móvil se simplifica a menú, buscador, marca, favoritos y bolsa.
- La navegación por categoría es directa y usa mayúsculas, texto pequeño y mucho espacio libre.
- Para Due Sorelas se conservará la jerarquía visual, pero se reemplazarán bolsa, cuenta y favoritos por un acceso simple a Instagram/WhatsApp si aportan valor; no habrá checkout en esta primera etapa.

### Inicio

- La portada abre con una imagen editorial a pantalla completa y una llamada a la acción mínima superpuesta.
- Después presenta categorías mediante módulos fotográficos de gran tamaño y composición asimétrica.
- La fotografía tiene el protagonismo; el texto es reducido y sobrio.
- Adaptación propuesta: hero de marca + grilla de los cinco rubros iniciales (Collares, Dijes, Colgantes, Pulseras y Accesorios). Cada módulo llevará a su listado.

### Listado de productos

- Título de categoría y una breve introducción encima de la grilla.
- Subcategorías/filtros en una sola línea, con una acción de filtrado al extremo derecho.
- Grilla de cuatro columnas en escritorio; dos columnas en móvil.
- Cada tarjeta usa imagen vertical, nombre, material/cualidad, precio, etiqueta opcional y favorito. El hover puede revelar una segunda imagen.
- Adaptación propuesta: tarjetas con foto, título, descripción corta, precio y botón/acción "Consultar". La tarjeta completa también abrirá el detalle. Los filtros se dejarán visualmente previstos, pero sin lógica hasta que exista el servicio de productos.

### Detalle de producto

- En escritorio: galería vertical en dos columnas a la izquierda e información sticky a la derecha.
- La información contiene nombre, precio, atributos, variantes, llamada a la acción y acordeones de detalle.
- En móvil: galería primero y ficha debajo; el contenido mantiene una jerarquía muy legible.
- Adaptación propuesta: 3–5 imágenes, nombre, descripción completa, precio, atributos opcionales y botón "Consultar por WhatsApp" con mensaje precargado. Los acordeones se usarán para materiales/cuidado/medidas cuando aplique.

## Sistema visual a adoptar

- Estilo: minimalismo editorial, cálido y contemporáneo.
- Fondo: blanco roto o marfil muy claro; texto negro o grafito.
- Tipografía: sans serif geométrica/neo-grotesca para interfaz y una serif editorial opcional, usada con contención, para acentos de marca.
- Escala: títulos amplios, UI pequeña en mayúsculas y espaciado generoso.
- Imágenes: producto sobre fondos limpios combinadas con fotos de uso. Proporción vertical recomendada 4:5 para catálogo.
- Movimiento: transiciones cortas, sutiles y respetuosas de `prefers-reduced-motion`.

## Alcance de la primera versión

1. Inicio navegable por rubros.
2. Listado por categoría con datos hardcodeados.
3. Detalle individual de producto con CTA a WhatsApp.
4. Diseño responsive desde móvil hasta escritorio.
5. Datos aislados en una capa local para sustituirla luego por un servicio sin rehacer las pantallas.
6. SEO básico, accesibilidad y documentación técnica/funcional.

## Fuera de alcance inicial

- Carrito, pagos, stock en tiempo real, usuarios, favoritos persistentes y buscador funcional.
- Backoffice, almacenamiento definitivo de imágenes y API de productos. Se decidirán y diseñarán en la siguiente etapa.

## Propuesta técnica preliminar

- Frontend: React + Vite + TypeScript, con React Router para las rutas `/`, `/categorias/:slug` y `/productos/:slug`.
- Estilos: CSS propio con variables de diseño; sin depender de un kit visual pesado.
- Datos de ejemplo: `src/data/products.ts` y `src/data/categories.ts` tipados, detrás de una interfaz/repository que después podrá consumir API o CMS.
- Recursos: fotografías de muestra propias o con licencia apta para demostración, guardadas localmente durante esta etapa.

## Decisiones pendientes del cliente

- Identidad visual (logo, paleta y tipografías).
- Número de WhatsApp y texto base de consulta.
- Moneda y formato de precios.
- Fotos disponibles y dirección de arte.
- Plataforma de hosting y prioridad del futuro backoffice.

