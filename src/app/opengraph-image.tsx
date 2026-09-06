import { ImageResponse } from 'next/og'
import { BRAND, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og/brand'

// Imagen OG por defecto del sitio. Se genera por código en vez de commitear un PNG
// porque el repo no tiene carpeta public/ y así la tarjeta sigue los colores de marca
// sin depender de un asset que haya que rehacer a mano cada rediseño.
export const alt = 'Sara Medical — Software médico con inteligencia artificial'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src={BRAND.iconUrl} width={72} height={72} alt="" style={{ borderRadius: 18 }} />
          <div style={{ display: 'flex', fontSize: 40, color: '#fff', fontWeight: 700, letterSpacing: -1 }}>
            Sara<span style={{ fontWeight: 300, opacity: 0.85 }}>&nbsp;Medical</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 68, lineHeight: 1.1, color: '#fff', fontWeight: 800, letterSpacing: -2 }}>
            Software médico con IA
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: 'rgba(255,255,255,0.9)', maxWidth: 900 }}>
            Agenda, fichas clínicas, recetas digitales y marketing automatizado en un solo lugar.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>
          consultorio.site
        </div>
      </div>
    ),
    size,
  )
}
