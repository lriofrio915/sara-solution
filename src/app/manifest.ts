import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/seo'
import { BRAND } from '@/lib/og/brand'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sara Medical — Software Médico con IA',
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: BRAND.primary,
    lang: SITE.lang,
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
