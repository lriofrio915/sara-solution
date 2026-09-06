/**
 * Constantes de marca compartidas por las imágenes OG generadas con next/og.
 * Se mantienen aquí para que las tarjetas de la landing y las de los perfiles públicos
 * salgan idénticas y sigan los mismos colores que Tailwind (--color-primary).
 */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

export const BRAND = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  ink: '#0f172a',
  muted: '#64748b',
  surface: '#ffffff',
  iconUrl: 'https://res.cloudinary.com/deusntwkn/image/upload/v1773867085/icono_sara_bj4txo.png',
} as const
