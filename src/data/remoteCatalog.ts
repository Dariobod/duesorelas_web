import { useEffect, useState } from 'react'
import { products as fallbackProducts, type Product } from './catalog'

type ApiProduct = {
  slug: string
  title: string
  description: string
  materials: string
  measurements: string
  priceArs: number
  category: string
  images?: Array<{ url: string }>
}

const mapProduct = (item: ApiProduct): Product => {
  const gallery = (item.images || []).map((image) => image.url).filter(Boolean)
  const fallback = fallbackProducts.find((product) => product.slug === item.slug)
  const image = gallery[0] || fallback?.image || '/assets/catalogo-due-sorelas.png'
  return { slug: item.slug, category: item.category, name: item.title, shortDescription: item.description.slice(0, 120), description: item.description, price: item.priceArs, material: item.materials, dimensions: item.measurements, image, gallery: gallery.length ? gallery : [image] }
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
