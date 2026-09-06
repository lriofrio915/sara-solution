import { ImageResponse } from 'next/og'
import { BRAND } from '@/lib/og/brand'

// Favicon generado por código: el repo no tiene carpeta public/ donde poner un .ico.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND.primary,
          color: '#fff',
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 7,
          fontFamily: 'sans-serif',
        }}
      >
        S
      </div>
    ),
    size,
  )
}
