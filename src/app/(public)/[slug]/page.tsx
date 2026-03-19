import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import DoctorContactForm from '@/components/DoctorContactForm'

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
      avatarUrl: true, address: true, whatsapp: true, webhookUrl: true,
      branches: true, schedules: true, services: true, phone: true,
      credentials: { orderBy: [{ type: 'asc' as const }, { createdAt: 'desc' as const }] },
    },
  })

  if (!doctor) notFound()

  const initials      = getInitials(doctor.name)
  const displayName   = formatDoctorName(doctor.name)
  const firstName     = displayName  // usado en WhatsApp y saludos
  type ServiceItem = { name: string; description?: string; price?: string; emoji?: string }
  let servicesList: ServiceItem[] = []
  if (doctor.services) {
    try {
      const parsed = JSON.parse(doctor.services)
      servicesList = Array.isArray(parsed)
        ? parsed.filter((s: ServiceItem) => s?.name)
        : doctor.services.split('\n').map((s) => ({ name: s.trim() })).filter((s) => s.name)
    } catch {
      servicesList = doctor.services.split('\n').map((s) => ({ name: s.trim() })).filter((s) => s.name)
    }
  }
  const scheduleLines = doctor.schedules
    ? doctor.schedules.split('\n').map((s) => s.trim()).filter(Boolean)
    : []

  let parsedBranches: { name: string; address: string }[] = []
  try {
    parsedBranches = doctor.branches ? JSON.parse(doctor.branches) : []
  } catch { /* ignore */ }

  const whatsappNumber = doctor.whatsapp?.replace(/\D/g, '') ?? null
  const whatsappUrl    = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=Hola+${encodeURIComponent(displayName)}%2C+me+gustar%C3%ADa+agendar+una+cita`
    : null

  // Avatar reutilizable
  const AvatarLg = () => doctor.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={doctor.avatarUrl} alt={doctor.name}
      className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-white font-bold text-5xl"
      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}>
      {initials}
    </div>
  )

  const AvatarSm = () => doctor.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={doctor.avatarUrl} alt={doctor.name}
      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
  ) : (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}>
      {initials}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">

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
            className="flex items-center gap-1.5 text-white font-semibold px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm shadow-md hover:opacity-90 transition-all hover:-translate-y-0.5 flex-shrink-0"
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
            <div className="flex-shrink-0 relative mb-4 md:mb-0">
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
              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
                {displayName}
              </h1>
              {doctor.bio && (
                <p className="text-gray-500 text-base md:text-lg leading-relaxed mb-6 md:mb-8 max-w-xl">
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
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 pb-10 md:pb-12 border-b border-gray-100">
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
        {(scheduleLines.length > 0 || doctor.address || parsedBranches.length > 0) && (
          <div className={`grid gap-6 py-12 ${scheduleLines.length > 0 ? 'md:grid-cols-2' : ''}`}>
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

            {(doctor.address || parsedBranches.length > 0) && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-5 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-xl flex-shrink-0">📍</span>
                  {parsedBranches.length > 0 ? 'Centros de atención' : 'Ubicación'}
                </h2>

                {/* Consultorio principal */}
                {doctor.address && (
                  <div className={parsedBranches.length > 0 ? 'mb-4' : ''}>
                    {parsedBranches.length > 0 && (
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Consultorio principal</p>
                    )}
                    <p className="text-gray-600 text-sm leading-relaxed">{doctor.address}</p>
                  </div>
                )}

                {/* Sucursales */}
                {parsedBranches.length > 0 && (
                  <div className="space-y-3 mt-3">
                    {parsedBranches.map((branch, i) => (
                      <div key={i} className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                        {branch.name && (
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{branch.name}</p>
                        )}
                        <p className="text-gray-600 text-sm leading-relaxed">{branch.address}</p>
                      </div>
                    ))}
                  </div>
                )}

                {doctor.phone && (
                  <a href={`tel:${doctor.phone}`}
                    className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors mt-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
              {servicesList.map((service, i) => (
                <div key={i}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md hover:-translate-y-1 hover:border-blue-100 transition-all duration-200 group">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 md:mb-3 text-xl md:text-2xl group-hover:scale-110 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 100%)' }}>
                    {service.emoji || SERVICE_ICONS[i % SERVICE_ICONS.length]}
                  </div>
                  <p className="font-semibold text-gray-800 text-xs md:text-sm leading-snug">{service.name}</p>
                  {service.price && (
                    <p className="text-blue-600 text-xs font-medium mt-1">${service.price}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── FORMACIÓN Y CREDENCIALES ── */}
        {doctor.credentials.length > 0 && (() => {
          const CRED_META: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
            SENESCYT:      { icon: '🏛️', label: 'Registro SENESCYT',    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            TITULO_TERCER: { icon: '🎓', label: 'Título Tercer Nivel',   color: '#0D9488', bg: '#F0FDFA', border: '#99F6E4' },
            TITULO_CUARTO: { icon: '🏅', label: 'Título Cuarto Nivel',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
            CERTIFICADO:   { icon: '📜', label: 'Certificado / Diploma', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
            CURSO:         { icon: '📚', label: 'Curso de Capacitación', color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74' },
            SEMINARIO:     { icon: '🎤', label: 'Seminario / Congreso',  color: '#DB2777', bg: '#FDF2F8', border: '#FBCFE8' },
          }
          return (
            <section className="pb-12">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 font-semibold text-sm px-4 py-1.5 rounded-full mb-4 border border-amber-100">
                  🏆 Formación y credenciales
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Preparación profesional</h2>
                <p className="text-gray-400 text-sm">Títulos, registros y certificaciones que avalan la experiencia de {firstName}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctor.credentials.map((cred) => {
                  const m = CRED_META[cred.type] ?? CRED_META.CERTIFICADO
                  const isPdf = cred.mimeType === 'application/pdf'
                  return (
                    <a
                      key={cred.id}
                      href={cred.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-4 bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                      style={{ borderColor: m.border }}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                        style={{ background: m.bg, border: `1px solid ${m.border}` }}>
                        {m.icon}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5"
                          style={{ color: m.color, background: m.bg }}>
                          {m.label}
                        </span>
                        <p className="font-bold text-gray-900 text-sm leading-snug truncate">{cred.title}</p>
                        {cred.institution && (
                          <p className="text-gray-500 text-xs mt-0.5 truncate">{cred.institution}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {cred.year && (
                            <span className="text-xs text-gray-400 font-medium">{cred.year}</span>
                          )}
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{isPdf ? '📄 Ver PDF' : '🖼️ Ver imagen'}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            className="ml-auto text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </section>
          )
        })()}

        {/* ── CTA CON FOTO DEL DOCTOR ── */}
        <section className="mb-12 rounded-3xl overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #0D9488 100%)' }}>
          <div className="flex flex-col md:flex-row items-center">

            {/* Foto del doctor — lado izquierdo */}
            <div className="w-full md:w-64 h-48 md:h-auto flex-shrink-0 relative overflow-hidden">
              {doctor.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
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
            <div className="flex-1 p-6 md:p-12 text-white text-center md:text-left">
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

      {/* ── FORMULARIO DE CONTACTO ── */}
      {doctor.webhookUrl && (
        <section className="py-12 mb-4 px-4">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <span className="inline-block bg-blue-50 text-blue-600 font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
                Contacto directo
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¿Tienes alguna pregunta?
              </h2>
              <p className="text-gray-500 text-sm">
                Deja tus datos y el equipo de {displayName} te responderá a la brevedad.
              </p>
            </div>
            <DoctorContactForm slug={params.slug} doctorName={displayName} />
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 bg-white py-6 text-center text-gray-400 text-xs">
        <p>Página gestionada con <a href="https://www.consultorio.site" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-500 hover:text-blue-600 transition-colors">consultorio.site</a></p>
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
