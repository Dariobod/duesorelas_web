import { useEffect, useState } from 'react'

export type HeroMediaType = 'image' | 'video'
export type HomeContent = { heroMediaUrl: string; heroMediaType: HeroMediaType; craftVideo: string }

export const defaultHomeContent: HomeContent = {
  heroMediaUrl: '/assets/hero-due-sorelas.png',
  heroMediaType: 'image',
  craftVideo: 'https://videos.pexels.com/video-files/6263745/6263745-sd_360_640_25fps.mp4',
}

export function useRemoteContent() {
  const [content, setContent] = useState<HomeContent>(defaultHomeContent)

  useEffect(() => {
    fetch('/api/content')
      .then((response) => response.ok ? response.json() : null)
      .then((value: Partial<HomeContent & { heroImage?: string }> | null) => {
        if (!value) return
        setContent({
          ...defaultHomeContent,
          ...value,
          heroMediaUrl: value.heroMediaUrl || value.heroImage || defaultHomeContent.heroMediaUrl,
          heroMediaType: value.heroMediaType === 'video' ? 'video' : 'image',
        })
      })
      .catch(() => undefined)
  }, [])

  return content
}
