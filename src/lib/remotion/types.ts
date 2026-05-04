export interface LowerThird {
  name: string
  role: string
}

export interface VideoParams {
  template: 'talking_head' | 'announcement' | 'testimonial'
  title: string
  subtitle?: string | null
  lowerThird?: LowerThird | null
  cta?: string | null
  ctaAt?: number
  primaryColor: string
  bgColor: string
  textColor: string
  duration: number
  fps: number
  platform: 'tiktok' | 'instagram' | 'youtube' | 'presentacion'
  videoUrl?: string | null
}

export const PLATFORM_DIMS: Record<string, { width: number; height: number }> = {
  tiktok:       { width: 1080, height: 1920 },
  instagram:    { width: 1080, height: 1080 },
  youtube:      { width: 1920, height: 1080 },
  presentacion: { width: 1920, height: 1080 },
}
