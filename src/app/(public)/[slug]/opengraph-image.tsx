import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'
import { BRAND, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og/brand'

// Tarjeta de previsualización del perfil público. Solo usa datos que el médico ya
// publica en su propia página (nombre, especialidad, ciudad): ninguna imagen OG de este
// proyecto puede tocar información de pacientes.
export const alt = 'Perfil profesional en Sara Medical'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function ProfileOpengraphImage({ params }: { params: { slug: string } }) {
  const doctor = await prisma.doctor.findUnique({
    where: { slug: params.slug },
    select: { name: true, specialty: true, canton: true, province: true },
  })

  const name = doctor?.name ?? 'Sara Medical'
  const specialty = doctor?.specialty ?? 'Software médico con IA'
  const location = [doctor?.canton, doctor?.province].filter(Boolean).join(', ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BRAND.surface,
          padding: '72px 80px',
          fontFamily: 'sans-serif',
          borderTop: `20px solid ${BRAND.primary}`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 26, color: BRAND.primary, fontWeight: 700, letterSpacing: 2 }}>
            {specialty.toUpperCase()}
          </div>
          <div style={{ display: 'flex', fontSize: 72, lineHeight: 1.05, color: BRAND.ink, fontWeight: 800, letterSpacing: -2, maxWidth: 1000 }}>
            {name}
          </div>
          {location ? (
            <div style={{ display: 'flex', fontSize: 30, color: BRAND.muted }}>{location}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 28, color: BRAND.muted }}>
            Agenda tu cita en línea
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={BRAND.iconUrl} width={48} height={48} alt="" style={{ borderRadius: 12 }} />
            <div style={{ display: 'flex', fontSize: 28, color: BRAND.ink, fontWeight: 700 }}>
              Sara<span style={{ fontWeight: 300, color: BRAND.muted }}>&nbsp;Medical</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
