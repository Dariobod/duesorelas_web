import { useEffect, useState } from 'react'
import { products as fallbackProducts, type Product } from './catalog'

type ApiProduct = {
  slug: string
  title: string
  description: string
  materials: string
  measurements: string
  priceArs: number
  price_note?: string
  featured?: number | boolean
  category: string
  images?: Array<{ url: string }>
}

const mapProduct = (item: ApiProduct): Product => {
  const gallery = (item.images || []).map((image) => image.url).filter(Boolean)
  const fallback = fallbackProducts.find((product) => product.slug === item.slug)
  const image = gallery[0] || fallback?.image || '/assets/catalogo-due-sorelas.png'
  const categoryAliases: Record<string, string> = { collar: 'collares', pulsera: 'pulseras', dije: 'dijes', colgante: 'colgantes', accesorio: 'accesorios' }
  return { slug: item.slug, category: categoryAliases[item.category] || item.category, name: item.title, shortDescription: item.description.slice(0, 120), description: item.description, price: item.priceArs, priceNote: item.price_note || '', material: item.materials, dimensions: item.measurements, image, gallery: gallery.length ? gallery : [image], featured: item.featured === true || item.featured === 1 }
}

export function useRemoteProducts() {
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([])
  useEffect(() => {
    let active = true
    fetch('/api/products')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('API unavailable')))
      .then((data: ApiProduct[]) => { if (active && Array.isArray(data)) setRemoteProducts(data.map(mapProduct)) })
      .catch(() => undefined)
    return () => { active = false }
  }, [])
  return remoteProducts.length ? remoteProducts : fallbackProducts
}
