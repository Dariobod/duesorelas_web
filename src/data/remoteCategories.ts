import { useEffect, useState } from 'react'
import { categories as fallbackCategories, type Category } from './catalog'

type ApiCategory = { slug: string; name: string; image_url?: string; intro?: string }

export function useRemoteCategories() {
  const [remote, setRemote] = useState<ApiCategory[] | null>(null)
  useEffect(() => {
    let active = true
    fetch('/api/categories')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('API unavailable')))
      .then((data: ApiCategory[]) => { if (active && Array.isArray(data)) setRemote(data) })
      .catch(() => undefined)
    return () => { active = false }
  }, [])
  if (!remote) return fallbackCategories
  const aliases: Record<string, string> = { collares: 'collar', dijes: 'dije', colgantes: 'colgante', pulseras: 'pulsera', accesorios: 'accesorio' }
  const normalized: Category[] = remote.map((item) => {
    const fallback = fallbackCategories.find((category) => category.slug === item.slug || aliases[category.slug] === item.slug)
    return {
      slug: fallback?.slug || item.slug,
      name: item.name || fallback?.name || item.slug,
      intro: item.intro || fallback?.intro || 'Piezas pensadas para acompañar tus días.',
      image: item.image_url || fallback?.image || '/assets/catalogo-due-sorelas.png',
      position: fallback?.position,
    } as Category
  })
  return normalized.concat(fallbackCategories.filter((category) => !remote.some((item) => item.slug === category.slug || aliases[category.slug] === item.slug)))
}
