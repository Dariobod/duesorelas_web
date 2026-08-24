import { useEffect, useState } from 'react'

export type HomeContent = { heroImage: string; craftVideo: string }

export const defaultHomeContent: HomeContent = {
  heroImage: '/assets/hero-due-sorelas.png',
  craftVideo: 'https://videos.pexels.com/video-files/6263745/6263745-sd_360_640_25fps.mp4',
}

export function useRemoteContent() {
  const [content, setContent] = useState<HomeContent>(defaultHomeContent)

  useEffect(() => {
    fetch('/api/content')
      .then((response) => response.ok ? response.json() : null)
      .then((value: HomeContent | null) => value && setContent({ ...defaultHomeContent, ...value }))
      .catch(() => undefined)
  }, [])

  return content
}
