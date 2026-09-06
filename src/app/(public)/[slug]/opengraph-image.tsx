import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'
import { BRAND, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og/brand'
import { getInitials, formatDoctorDisplayName } from '@/lib/utils'

// Tarjeta de previsualización del perfil público (WhatsApp, Facebook, X, LinkedIn).
// Solo usa datos que el médico ya publica en su propia página: nombre, especialidad,
// ciudad y foto de perfil. Ninguna imagen OG de este proyecto toca datos de paciente.
export const alt = 'Perfil profesional en Sara Medical'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/**
 * Descarga la foto y la incrusta como data URI.
 *
 * Satori descarga las `<img>` por su cuenta, y si esa petición falla revienta la
 * generación entera y el enlace se comparte sin imagen. Trayéndola aquí, con timeout,
 * un fallo se degrada a las iniciales en vez de tumbar la tarjeta.
 */
async function fetchAvatarDataUri(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? 'image/jpeg'
    if (!type.startsWith('image/')) return null
    const buffer = await res.arrayBuffer()
    // Por encima de ~1.5MB no compensa: engorda el PNG final y ralentiza el render.
    if (buffer.byteLength > 1_500_000) return null
    return `data:${type};base64,${Buffer.from(buffer).toString('base64')}`
  } catch {
    return null
  }
}

export default async function ProfileOpengraphImage(
  // En esta versión de Next `params` es una Promise. Tiparlo como objeto plano dejaba
  // `slug` en undefined, Prisma lanzaba y la ruta devolvía 500: los enlaces se
  // compartían sin previsualización.
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const doctor = await prisma.doctor.findUnique({
    where: { slug },
    select: {
      name: true, titlePrefix: true, specialty: true,
      canton: true, province: true, avatarUrl: true, establishmentName: true,
    },
  })

  const displayName = doctor ? formatDoctorDisplayName(doctor.name, doctor.titlePrefix) : 'Sara Medical'
  const specialty = doctor?.specialty ?? 'Software médico con IA'
  // Cantón y provincia coinciden a menudo (ej. "Pastaza, Pastaza"); se deduplica para
  // que no quede repetido en la tarjeta.
  const location = [...new Set([doctor?.canton, doctor?.province].filter(Boolean))].join(', ')

  // El nombre del establecimiento puede ser muy largo y desbordar a dos líneas,
  // apretando el resto de la tarjeta.
  const establishment = doctor?.establishmentName && doctor.establishmentName.length > 42
    ? `${doctor.establishmentName.slice(0, 41).trimEnd()}…`
    : doctor?.establishmentName
  const avatar = await fetchAvatarDataUri(doctor?.avatarUrl ?? null)
  const initials = doctor ? getInitials(doctor.name) : 'SM'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: BRAND.surface,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Franja de marca a la izquierda */}
        <div
          style={{
            display: 'flex',
            width: 26,
            background: `linear-gradient(180deg, ${BRAND.primary} 0%, #0D9488 100%)`,
          }}
        />

        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            gap: 56,
            padding: '0 72px',
          }}
        >
          {/* Foto, o iniciales si no hay o si la descarga falló */}
          {avatar ? (
            <img
              src={avatar}
              width={300}
              height={300}
              alt=""
              style={{ width: 300, height: 300, borderRadius: 150, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: 300,
                height: 300,
                borderRadius: 150,
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${BRAND.primary} 0%, #0D9488 100%)`,
                color: '#fff',
                fontSize: 110,
                fontWeight: 700,
              }}
            >
              {initials}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 26, color: BRAND.primary, fontWeight: 700, letterSpacing: 1 }}>
              🩺 {specialty.toUpperCase()}
            </div>

            <div style={{ display: 'flex', fontSize: 64, lineHeight: 1.05, color: BRAND.ink, fontWeight: 800, letterSpacing: -2 }}>
              {displayName}
            </div>

            {location ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 30, color: BRAND.muted }}>
                📍 {location}
              </div>
            ) : null}

            {establishment ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 26, color: BRAND.muted }}>
                🏥 {establishment}
              </div>
            ) : null}

            {/* Sin médico resuelto (slug inexistente) la tarjeta cae a la marca genérica,
                donde una llamada a agendar cita no tendría a quién referirse. */}
            {doctor ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: 12,
                  alignSelf: 'flex-start',
                  alignItems: 'center',
                  gap: 10,
                  background: BRAND.primary,
                  color: '#fff',
                  fontSize: 28,
                  fontWeight: 700,
                  padding: '14px 30px',
                  borderRadius: 999,
                }}
              >
                📅 Agenda tu cita en línea
              </div>
            ) : null}
          </div>
        </div>

        {/* Marca, abajo a la derecha */}
        <div
          style={{
            position: 'absolute',
            right: 48,
            bottom: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 24,
            color: BRAND.muted,
          }}
        >
          <img src={BRAND.iconUrl} width={36} height={36} alt="" style={{ borderRadius: 9 }} />
          consultorio.site
        </div>
      </div>
    ),
    {
      ...size,
      // Los emojis no existen en las fuentes que Satori trae por defecto: sin esto se
      // renderizan como cuadros vacíos.
      emoji: 'twemoji',
    },
  )
}
