export type Category = {
  slug: string
  name: string
  intro: string
  image: string
  position?: string
}

export type Product = {
  slug: string
  category: string
  name: string
  shortDescription: string
  description: string
  price: number
  priceNote?: string
  material: string
  dimensions: string
  image: string
  gallery: string[]
  position?: string
  featured?: boolean
}

const catalogImage = '/assets/catalogo-due-sorelas.png'
const heroImage = '/assets/hero-due-sorelas.png'

export const categories: Category[] = [
  { slug: 'collares', name: 'Collares', intro: 'Capas, amuletos y detalles que acompañan todos los días.', image: heroImage, position: '35% center' },
  { slug: 'dijes', name: 'Dijes', intro: 'Pequeños símbolos para hacer tuyo cada gesto.', image: catalogImage, position: '42% 58%' },
  { slug: 'colgantes', name: 'Colgantes', intro: 'Piezas livianas para llevar cerca.', image: catalogImage, position: '18% 50%' },
  { slug: 'pulseras', name: 'Pulseras', intro: 'Texturas, perlas y color para sumar movimiento.', image: catalogImage, position: '75% 40%' },
  { slug: 'accesorios', name: 'Accesorios', intro: 'Objetos pequeños, hechos para regalar o guardar.', image: catalogImage, position: '55% 80%' },
]

export const products: Product[] = [
  {
    slug: 'collar-aurora', category: 'collares', name: 'Collar Aurora', shortDescription: 'Cristal traslúcido y baño dorado.', description: 'Un collar delicado para usar solo o en capas. Combina pequeñas cuentas translúcidas, un dije de luz y una cadena de tono dorado. Cada pieza se arma a mano, por eso puede tener sutiles variaciones.', price: 24500, material: 'Cristal, acero y baño dorado', dimensions: 'Largo regulable: 38 a 44 cm', image: heroImage, gallery: [heroImage, catalogImage, heroImage], position: '35% center', featured: true,
  },
  {
    slug: 'dije-sol-azul', category: 'dijes', name: 'Dije Sol Azul', shortDescription: 'Un amuleto de luz en azul profundo.', description: 'Dije redondo con relieve solar y centro azul. Ideal para sumar a una cadena favorita o regalar como pequeño amuleto. La terminación puede variar levemente por su proceso artesanal.', price: 12900, material: 'Aleación metálica y resina', dimensions: '2 cm de diámetro', image: catalogImage, gallery: [catalogImage, heroImage, catalogImage], position: '29% 35%',
  },
  {
    slug: 'colgante-luna-rosa', category: 'colgantes', name: 'Colgante Luna Rosa', shortDescription: 'Luna creciente y piedra rosa suave.', description: 'Un colgante de inspiración nocturna, de líneas suaves y brillo cálido. Puede usarse en cadena, aro o como detalle de un accesorio para celular.', price: 14600, material: 'Aleación metálica, piedra sintética', dimensions: '3 cm de alto', image: catalogImage, gallery: [catalogImage, heroImage, catalogImage], position: '26% 52%',
  },
  {
    slug: 'pulsera-marea', category: 'pulseras', name: 'Pulsera Marea', shortDescription: 'Perlas irregulares con acentos azules.', description: 'Pulsera elástica de perlas de agua dulce simuladas y cuentas de color. Está pensada para usar todos los días, sola o mezclada con otras piezas.', price: 19800, material: 'Perlas sintéticas, cristal y acero', dimensions: 'Elástica · 16 a 19 cm', image: catalogImage, gallery: [catalogImage, heroImage, catalogImage], position: '74% 38%', featured: true,
  },
  {
    slug: 'dije-estrella-mini', category: 'dijes', name: 'Dije Estrella Mini', shortDescription: 'Brillo sutil para personalizar.', description: 'Una estrella pequeña de ocho puntas para combinar con dijes, aros o cadenas. Su escala mínima la hace especial para armar composiciones personales.', price: 8900, material: 'Aleación metálica y baño dorado', dimensions: '1,2 cm de diámetro', image: catalogImage, gallery: [catalogImage, heroImage], position: '66% 73%',
  },
  {
    slug: 'accesorio-celeste', category: 'accesorios', name: 'Colgante Celeste', shortDescription: 'Detalle para celular con cuentas y color.', description: 'Colgante para teléfono con cuentas de cristal y herraje resistente. Un detalle liviano, hecho para acompañar tus días y sumar color a lo cotidiano.', price: 16200, material: 'Cristal, nylon y herrajes', dimensions: '18 cm de largo', image: catalogImage, gallery: [catalogImage, heroImage], position: '48% 78%',
  },
  {
    slug: 'collar-cielo', category: 'collares', name: 'Collar Cielo', shortDescription: 'Piedra azul y cadena de tono dorado.', description: 'Collar con piedra de azul suave y caída minimalista. Una pieza versátil que funciona tanto como protagonista como en combinación con otras cadenas.', price: 22900, material: 'Piedra sintética y acero', dimensions: 'Largo regulable: 40 a 46 cm', image: heroImage, gallery: [heroImage, catalogImage], position: '35% 70%',
  },
  {
    slug: 'pulsera-luz', category: 'pulseras', name: 'Pulsera Luz', shortDescription: 'Cristales transparentes de brillo suave.', description: 'Una pulsera de pequeñas cuentas translúcidas y detalles dorados. Su terminación artesanal hace que no existan dos piezas exactamente iguales.', price: 17600, material: 'Cristal y acero', dimensions: 'Elástica · 16 a 19 cm', image: heroImage, gallery: [heroImage, catalogImage], position: '46% 90%',
  },
]

export const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export const whatsappUrl = (productName: string) =>
  `https://api.whatsapp.com/send?phone=+5491156224021&text=${encodeURIComponent(`Hola, me gustaría consultar por ${productName} de Due Sorelas.`)}`
