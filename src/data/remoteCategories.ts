import { useEffect, useState } from 'react'
import { categories as fallbackCategories, type Category } from './catalog'

type ApiCategory = { slug: string; name: string; image_url?: string }

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
  return fallbackCategories.map((category: Category) => {
    const current = remote.find((item) => item.slug === category.slug || item.slug === aliases[category.slug])
    return current?.image_url ? { ...category, image: current.image_url } : category
  })
}
