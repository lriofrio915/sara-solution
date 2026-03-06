import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

// Palabras de título profesional que se eliminan del nombre para mostrarlo corto
const TITLE_WORDS = new Set([
  'medico','médico','medica','médica','cirujano','cirujana',
  'doctor','doctora','especialista','licenciado','licenciada',
  'ing','lic','dr','dra','dr.','dra.',
])
const FEMININE_WORDS = new Set(['médica','medica','cirujana','doctora','licenciada','dra','dra.'])

// "Medico Cirujano Luis Eduardo Riofrio Lopez" → "Dr. Luis Riofrio"
function formatDoctorName(fullName: string): string {
  const isFeminine = fullName.split(' ').some((w) => FEMININE_WORDS.has(w.toLowerCase()))
  const parts = fullName.split(' ').filter((w) => !TITLE_WORDS.has(w.toLowerCase()))
  const shortName = parts.slice(0, 2).join(' ')
  return `${isFeminine ? 'Dra.' : 'Dr.'} ${shortName}`
}

// Íconos médicos variados — se asignan por índice, nunca se repite el mismo consecutivamente
const SERVICE_ICONS = ['🫀','🧠','🩺','💊','🩻','🔬','🩹','🧬','💉','🏥','👁️','🦴','🫁','🩸','🧪','🌡️','🦷','🫂']

function WhatsAppIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doctor = await prisma.doctor.findUnique({
    where: { slug: params.slug },
    select: { name: true, specialty: true, bio: true, avatarUrl: true },
  })
  if (!doctor) return { title: 'Médico no encontrado' }
  return {
    title: `${doctor.name} | ${doctor.specialty}`,
    description: doctor.bio ?? `Agenda tu cita con ${doctor.name}, especialista en ${doctor.specialty}.`,
    openGraph: {
      title: `${doctor.name} — ${doctor.specialty}`,
      description: doctor.bio ?? '',
      images: doctor.avatarUrl ? [doctor.avatarUrl] : [],
    },
  }
}

export default async function DoctorPublicPage({ params }: Props) {
  const doctor = await prisma.doctor.findUnique({
    where: { slug: params.slug },
    select: {
      id: true, name: true, specialty: true, bio: true,
      avatarUrl: true, address: true, whatsapp: true,
      schedules: true, services: true, phone: true,
    },
  })

  if (!doctor) notFound()

  const initials      = getInitials(doctor.name)
  const displayName   = formatDoctorName(doctor.name)
  const firstName     = displayName  // usado en WhatsApp y saludos
  const servicesList = doctor.services
    ? doctor.services.split('\n').map((s) => s.trim()).filter(Boolean)
    : []
  const scheduleLines = doctor.schedules
    ? doctor.schedules.split('\n').map((s) => s.trim()).filter(Boolean)
    : []

  const whatsappNumber = doctor.whatsapp?.replace(/\D/g, '') ?? null
  const whatsappUrl    = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=Hola+${encodeURIComponent(displayName)}%2C+me+gustar%C3%ADa+agendar+una+cita`
    : null

  // Avatar reutilizable
  const AvatarLg = () => doctor.avatarUrl ? (
    <img src={doctor.avatarUrl} alt={doctor.name}
      className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-white font-bold text-5xl"
      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}>
      {initials}
    </div>
  )

  const AvatarSm = () => doctor.avatarUrl ? (
    <img src={doctor.avatarUrl} alt={doctor.name}
      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
  ) : (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}>
      {initials}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── STICKY HEADER ── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AvatarSm />
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">{displayName}</p>
              <p className="text-blue-600 text-xs font-medium">{doctor.specialty}</p>
            </div>
          </div>
          <Link href={`/${params.slug}/chat`}
            className="flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md hover:opacity-90 transition-all hover:-translate-y-0.5 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}>
            <span>📅</span>
            Reservar cita
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4">

        {/* ── HERO ── */}
        <section className="py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">

            {/* Foto del doctor — prominente */}
            <div className="flex-shrink-0 relative">
              {/* Anillo decorativo */}
              <div className="absolute inset-0 rounded-full scale-110 opacity-20"
                style={{ background: 'linear-gradient(135deg, #2563EB, #0D9488)' }} />
              <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-white shadow-2xl relative z-10">
                <AvatarLg />
              </div>
              {/* Badge de especialidad */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap
                bg-white border border-gray-100 shadow-lg rounded-full px-4 py-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-semibold text-gray-700">Disponible para citas</span>
              </div>
            </div>

            {/* Texto */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-2">
                {doctor.specialty}
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
                {displayName}
              </h1>
              {doctor.bio && (
                <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-xl">
                  {doctor.bio}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href={`/${params.slug}/chat`}
                  className="flex items-center justify-center gap-2.5 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:opacity-90 transition-all hover:-translate-y-0.5 text-base"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}>
                  <span>📅</span>
                  Reservar mi cita
                </Link>
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-8 py-4 rounded-2xl shadow-lg transition-all hover:-translate-y-0.5 text-base">
                    <WhatsAppIcon size={20} />
                    Escribir por WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST BADGES ── */}
        <div className="flex flex-wrap justify-center gap-6 pb-12 border-b border-gray-100">
          {[
            { icon: '🕐', label: 'Atención 24/7' },
            { icon: '🔒', label: 'Datos protegidos' },
            { icon: '⚡', label: 'Respuesta inmediata' },
            { icon: '📋', label: 'Sin filas de espera' },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="text-xl">{b.icon}</span>
              <span className="font-medium">{b.label}</span>
            </div>
          ))}
        </div>

        {/* ── HORARIOS + UBICACIÓN ── */}
        {(scheduleLines.length > 0 || doctor.address) && (
          <div className="grid md:grid-cols-2 gap-6 py-12">
            {scheduleLines.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-5 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">🕐</span>
                  Horarios de atención
                </h2>
                <ul className="space-y-2.5">
                  {scheduleLines.map((line, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-600 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {doctor.address && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-5 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-xl flex-shrink-0">📍</span>
                  Ubicación
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{doctor.address}</p>
                {doctor.phone && (
                  <a href={`tel:${doctor.phone}`}
                    className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                    <span>📞</span>
                    {doctor.phone}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SERVICIOS ── */}
        {servicesList.length > 0 && (
          <section className="pb-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Servicios</h2>
              <p className="text-gray-400 text-sm">Todo lo que {firstName} ofrece para tu bienestar</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {servicesList.map((service, i) => (
                <div key={i}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center hover:shadow-md hover:-translate-y-1 hover:border-blue-100 transition-all duration-200 group">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl group-hover:scale-110 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 100%)' }}>
                    {SERVICE_ICONS[i % SERVICE_ICONS.length]}
                  </div>
                  <p className="font-semibold text-gray-800 text-sm leading-snug">{service}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── CTA CON FOTO DEL DOCTOR ── */}
        <section className="mb-12 rounded-3xl overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #0D9488 100%)' }}>
          <div className="flex flex-col md:flex-row items-center">

            {/* Foto del doctor — lado izquierdo */}
            <div className="w-full md:w-64 h-56 md:h-auto flex-shrink-0 relative overflow-hidden">
              {doctor.avatarUrl ? (
                <img src={doctor.avatarUrl} alt={doctor.name}
                  className="w-full h-full object-cover object-top md:absolute md:inset-0" />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-20">
                  <div className="text-white text-8xl font-bold">{initials}</div>
                </div>
              )}
              {/* Gradiente de transición */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-blue-800/60 hidden md:block" />
            </div>

            {/* Texto + botón */}
            <div className="flex-1 p-8 md:p-12 text-white text-center md:text-left">
              <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-2">
                Atención personalizada
              </p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                ¿Listo para cuidar tu salud?
              </h2>
              <p className="text-white/75 mb-7 max-w-md leading-relaxed">
                {firstName} cuenta con un asistente digital disponible los 7 días de la semana para atenderte, responder tus dudas y agendar tu cita.
              </p>
              <Link href={`/${params.slug}/chat`}
                className="inline-flex items-center gap-2.5 bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg text-base">
                <span>💬</span>
                Consultar disponibilidad
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 bg-white py-6 text-center text-gray-400 text-xs">
        <p>Página gestionada con <span className="font-semibold text-gray-500">consultorio.site</span></p>
      </footer>

      {/* ── WHATSAPP FLOAT ── */}
      {whatsappUrl && (
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 group">
          <WhatsAppIcon size={28} />
          <span className="absolute right-16 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Escríbenos por WhatsApp
          </span>
        </a>
      )}
    </div>
  )
}
