import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import DoctorContactForm from '@/components/DoctorContactForm'
import PublicPageActions from '@/components/PublicPageActions'
import DoctorChatWidget from '@/components/DoctorChatWidget'
import PublicDoctorHeader from '@/components/PublicDoctorHeader'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

const TITLE_WORDS = new Set([
  'medico','médico','medica','médica','cirujano','cirujana',
  'doctor','doctora','especialista','licenciado','licenciada',
  'ing','lic','dr','dra','dr.','dra.',
])
const FEMININE_WORDS = new Set(['médica','medica','cirujana','doctora','licenciada','dra','dra.'])

function formatDoctorName(fullName: string, titlePrefix?: string | null): string {
  const parts = fullName.split(' ').filter((w) => !TITLE_WORDS.has(w.toLowerCase()))
  const shortName = parts.slice(0, 2).join(' ')
  if (titlePrefix) return `${titlePrefix} ${shortName}`
  const isFeminine = fullName.split(' ').some((w) => FEMININE_WORDS.has(w.toLowerCase()))
  return `${isFeminine ? 'Dra.' : 'Dr.'} ${shortName}`
}

function formatPrice(raw: string): string {
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''))
  if (isNaN(num)) return raw
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]


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
      id: true, name: true, titlePrefix: true, specialty: true, bio: true,
      avatarUrl: true, bannerUrl: true,
      address: true, webhookUrl: true, whatsapp: true,
      branches: true, services: true,
      consultationModes: true, paymentData: true,
      province: true, canton: true, parish: true,
      availabilitySchedules: { orderBy: { weekday: 'asc' } },
      credentials: { orderBy: [{ type: 'asc' as const }, { createdAt: 'desc' as const }] },
    },
  })

  if (!doctor) notFound()

  const initials    = getInitials(doctor.name)
  const displayName = formatDoctorName(doctor.name, doctor.titlePrefix)
  const firstName   = displayName

  // Services
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

  // Branches
  let parsedBranches: { name: string; address: string }[] = []
  try { parsedBranches = doctor.branches ? JSON.parse(doctor.branches) : [] } catch { /* */ }

  // Consultation modes
  let modes: string[] = []
  try { modes = doctor.consultationModes ? JSON.parse(doctor.consultationModes) : [] } catch { /* */ }

  // Payment
  type PaymentData = { methods: string[]; bankName?: string; accountNumber?: string; accountHolder?: string; accountType?: string; cryptoAddress?: string; cryptoNetwork?: string; cryptoCurrency?: string }
  let paymentData: PaymentData | null = null
  try { paymentData = doctor.paymentData ? JSON.parse(doctor.paymentData) : null } catch { /* */ }

  // Schedule — group slots by weekday
  const scheduleByDay = new Map<number, { startTime: string; endTime: string; location?: string | null }[]>()
  for (const s of doctor.availabilitySchedules) {
    if (!s.isActive) continue
    if (!scheduleByDay.has(s.weekday)) scheduleByDay.set(s.weekday, [])
    scheduleByDay.get(s.weekday)!.push({ startTime: s.startTime, endTime: s.endTime, location: s.location })
  }
  const activeDays = DISPLAY_ORDER.filter((d) => scheduleByDay.has(d))

  // Location string
  const locationParts = [doctor.canton, doctor.province].filter(Boolean)
  const locationStr = locationParts.join(', ')

  // Credential metadata
  const CRED_META: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
    SENESCYT:      { icon: '🏛️', label: 'Registro SENESCYT',    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    TITULO_TERCER: { icon: '🎓', label: 'Título Tercer Nivel',   color: '#0D9488', bg: '#F0FDFA', border: '#99F6E4' },
    TITULO_CUARTO: { icon: '🏅', label: 'Título Cuarto Nivel',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    CERTIFICADO:   { icon: '📜', label: 'Certificado / Diploma', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    CURSO:         { icon: '📚', label: 'Curso de Capacitación', color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74' },
    SEMINARIO:     { icon: '🎤', label: 'Seminario / Congreso',  color: '#DB2777', bg: '#FDF2F8', border: '#FBCFE8' },
  }

  const MODE_META: Record<string, { icon: string; label: string; desc: string }> = {
    IN_PERSON:   { icon: '🏥', label: 'Presencial',          desc: 'Atención en consultorio' },
    TELECONSULT: { icon: '💻', label: 'Teleconsulta',        desc: 'Videollamada online' },
    HOME_VISIT:  { icon: '🏠', label: 'Visita domiciliaria', desc: 'Atención en tu domicilio' },
  }

  const PAYMENT_META: Record<string, { icon: string; label: string }> = {
    CASH:     { icon: '💵', label: 'Efectivo' },
    CARD:     { icon: '💳', label: 'Tarjeta crédito/débito' },
    TRANSFER: { icon: '🏦', label: 'Transferencia bancaria' },
    CRYPTO:   { icon: '🪙', label: 'Criptomonedas' },
  }

  // Avatar helpers
  const AvatarSm = () => doctor.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={doctor.avatarUrl} alt={doctor.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
  ) : (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}>
      {initials}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">

      {/* ── FIXED HEADER (scroll-aware) ──────────────────────── */}
      <PublicDoctorHeader
        slug={params.slug}
        displayName={displayName}
        specialty={doctor.specialty}
        avatarUrl={doctor.avatarUrl}
        initials={initials}
      />

      {/* Spacer para compensar el header fixed */}
      <div className="h-16" />

      <main className="max-w-5xl mx-auto px-4">

        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            {/* Foto */}
            <div className="flex-shrink-0 relative mb-4 md:mb-0">
              <div className="absolute inset-0 rounded-full scale-110 opacity-20"
                style={{ background: 'linear-gradient(135deg, #2563EB, #0D9488)' }} />
              <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-white shadow-2xl relative z-10">
                {doctor.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doctor.avatarUrl} alt={doctor.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-5xl"
                    style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}>
                    {initials}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap bg-white border border-gray-100 shadow-lg rounded-full px-4 py-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-semibold text-gray-700">Disponible para citas</span>
              </div>
            </div>

            {/* Texto */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-2">{doctor.specialty}</p>
              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-4">{displayName}</h1>
              {locationStr && (
                <p className="text-gray-400 text-sm font-medium mb-3 flex items-center justify-center md:justify-start gap-1.5">
                  <span>📍</span> {locationStr}
                </p>
              )}
              {doctor.bio && (
                <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg leading-relaxed mb-6 md:mb-8 max-w-xl">{doctor.bio}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href={`/${params.slug}/chat`}
                  className="flex items-center justify-center gap-2.5 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:opacity-90 transition-all hover:-translate-y-0.5 text-base"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}>
                  <span>📅</span> Reservar mi cita
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── QUICK TRUST BADGES ────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 pb-12 border-b border-gray-100 dark:border-gray-800">
          {[
            { icon: '📅', label: 'Reservas 24/7' },
            { icon: '🔒', label: 'Datos protegidos' },
            { icon: '⚡', label: 'Respuesta inmediata' },
            { icon: '📋', label: 'Sin filas de espera' },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
              <span className="text-xl">{b.icon}</span>
              <span className="font-medium">{b.label}</span>
            </div>
          ))}
        </div>

        {/* ── MODALIDADES DE ATENCIÓN ───────────────────────── */}
        {modes.length > 0 && (
          <section className="py-12 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col items-center text-center mb-8">
              <span className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-2xl mb-3">🩺</span>
              <h2 className="font-bold text-gray-900 dark:text-white text-xl">Modalidades de atención</h2>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Cómo puedes ser atendido por {firstName}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
              {modes.map((m) => {
                const meta = MODE_META[m]
                if (!meta) return null
                return (
                  <div key={m} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col items-center text-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all w-full sm:w-52">
                    <span className="text-4xl">{meta.icon}</span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{meta.label}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{meta.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── HORARIO + UBICACIÓN (grid) ─────────────────────── */}
        {(activeDays.length > 0 || doctor.address || parsedBranches.length > 0) && (
          <section className="py-12 border-b border-gray-100 dark:border-gray-800">
            <div className={`grid gap-6 ${activeDays.length > 0 && (doctor.address || parsedBranches.length > 0) ? 'md:grid-cols-2' : ''}`}>

              {/* Horario */}
              {activeDays.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center text-center">
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-5 flex items-center justify-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-xl flex-shrink-0">🕐</span>
                    Horario de atención
                  </h2>
                  <div className="space-y-3 w-full">
                    {activeDays.map((weekday) => {
                      const slots = scheduleByDay.get(weekday) ?? []
                      return (
                        <div key={weekday} className="flex items-start justify-center gap-3">
                          <span className="w-24 flex-shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right">{DAYS[weekday]}</span>
                          <div className="flex flex-col gap-1 items-start">
                            {slots.map((slot, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-lg">
                                  {slot.startTime} – {slot.endTime}
                                </span>
                                {slot.location && (
                                  <span className="text-xs text-gray-400">· {slot.location}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Ubicación */}
              {(doctor.address || parsedBranches.length > 0) && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center text-center">
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-5 flex items-center justify-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-xl flex-shrink-0">📍</span>
                    {parsedBranches.length > 0 ? 'Centros de atención' : 'Ubicación'}
                  </h2>

                  {doctor.address && (
                    <div className={`w-full ${parsedBranches.length > 0 ? 'mb-4' : ''}`}>
                      {parsedBranches.length > 0 && (
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Consultorio principal</p>
                      )}
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{doctor.address}</p>
                      {locationStr && (
                        <p className="text-gray-400 text-xs mt-0.5">{locationStr}</p>
                      )}
                    </div>
                  )}

                  {parsedBranches.filter(b => b.address).map((branch, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-3 border border-gray-100 dark:border-gray-600 mb-2 w-full">
                      {branch.name && <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{branch.name}</p>}
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{branch.address}</p>
                    </div>
                  ))}

                  {/* Map visual */}
                  {(doctor.address || locationStr) && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent([doctor.address, locationStr].filter(Boolean).join(', '))}`}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-4 w-full block rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group"
                    >
                      <div
                        className="h-28 flex flex-col items-center justify-center gap-2 relative"
                        style={{
                          background: 'linear-gradient(135deg, #d1fae5 0%, #dbeafe 50%, #ede9fe 100%)',
                          backgroundImage: [
                            'linear-gradient(135deg, rgba(209,250,229,0.92) 0%, rgba(219,234,254,0.92) 50%, rgba(237,233,254,0.92) 100%)',
                            'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(148,163,184,0.25) 28px, rgba(148,163,184,0.25) 29px)',
                            'repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(148,163,184,0.25) 28px, rgba(148,163,184,0.25) 29px)',
                          ].join(', '),
                        }}
                      >
                        <div className="w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center text-2xl border-2 border-teal-100 group-hover:scale-110 transition-transform z-10">
                          📍
                        </div>
                        <span className="text-xs font-semibold text-gray-600 bg-white/90 px-3 py-1 rounded-full shadow-sm z-10">
                          Ver en Google Maps ↗
                        </span>
                      </div>
                    </a>
                  )}

                  {doctor.whatsapp && (
                    <a href={`https://wa.me/${doctor.whatsapp.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors mt-3">
                      <span>💬</span> {doctor.whatsapp}
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── SERVICIOS Y PRECIOS ────────────────────────────── */}
        {servicesList.length > 0 && (
          <section className="py-12 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col items-center text-center mb-8">
              <span className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-2xl mb-3">💼</span>
              <h2 className="font-bold text-gray-900 dark:text-white text-xl">Servicios y precios</h2>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Consultas y procedimientos que ofrece {firstName}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {servicesList.map((service, i) => (
                <div key={i}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-100 dark:hover:border-blue-900 transition-all duration-200 group flex flex-col items-center text-center gap-3 w-full sm:w-56">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 100%)' }}>
                    {service.emoji?.trim() || '🩺'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 dark:text-gray-200 text-sm leading-snug">{service.name}</p>
                    {service.description && (
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 leading-relaxed line-clamp-2">{service.description}</p>
                    )}
                    {service.price && (
                      <p className="text-blue-600 text-sm font-bold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {formatPrice(service.price)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── MÉTODOS DE PAGO ───────────────────────────────── */}
        {paymentData && paymentData.methods && paymentData.methods.length > 0 && (
          <section className="py-12 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col items-center text-center mb-8">
              <span className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-2xl mb-3">💰</span>
              <h2 className="font-bold text-gray-900 dark:text-white text-xl">Métodos de pago</h2>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Opciones disponibles para pagar tu consulta</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {paymentData.methods.map((method) => {
                const meta = PAYMENT_META[method]
                if (!meta) return null
                return (
                  <div key={method} className="inline-flex items-center gap-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <span className="text-xl">{meta.icon}</span>
                    {meta.label}
                  </div>
                )
              })}
            </div>

            {/* Detalle de criptomonedas */}
            {paymentData.methods.includes('CRYPTO') && paymentData.cryptoAddress && (
              <div className="mt-6 max-w-sm mx-auto bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🪙</span>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Datos para pago en cripto</p>
                </div>
                <div className="space-y-2">
                  {paymentData.cryptoCurrency && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Moneda</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{paymentData.cryptoCurrency}</span>
                    </div>
                  )}
                  {paymentData.cryptoNetwork && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Red</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{paymentData.cryptoNetwork}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Dirección de billetera</p>
                    <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                      {paymentData.cryptoAddress}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── FORMACIÓN Y CREDENCIALES ──────────────────────── */}
        {doctor.credentials.length > 0 && (
          <section className="py-12 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-7">
              <span className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-xl flex-shrink-0">🏆</span>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-xl">Formación y credenciales</h2>
                <p className="text-gray-400 dark:text-gray-500 text-sm">Títulos, registros y certificaciones de {firstName}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctor.credentials.map((cred) => {
                const m = CRED_META[cred.type] ?? CRED_META.CERTIFICADO
                return (
                  <a key={cred.id} href={cred.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="group flex items-start gap-4 bg-white dark:bg-gray-800 rounded-2xl border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                    style={{ borderColor: m.border }}>
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                      style={{ background: m.bg, border: `1px solid ${m.border}` }}>
                      {m.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5"
                        style={{ color: m.color, background: m.bg }}>
                        {m.label}
                      </span>
                      <p className="font-bold text-gray-900 dark:text-white text-sm leading-snug truncate">{cred.title}</p>
                      {cred.institution && <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 truncate">{cred.institution}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {cred.year && <span className="text-xs text-gray-400 font-medium">{cred.year}</span>}
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{cred.mimeType === 'application/pdf' ? '📄 Ver PDF' : '🖼️ Ver imagen'}</span>
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
        )}

        {/* ── CTA + FORMULARIO DE CONTACTO ─────────────────── */}
        {(() => {
          const ctaPhoto = doctor.bannerUrl ?? doctor.avatarUrl
          return (
            <section className="my-12 rounded-3xl overflow-hidden shadow-xl"
              style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #0D9488 100%)' }}>
              <div className="flex flex-col md:flex-row items-stretch">

                {/* Foto */}
                <div className="w-full md:w-72 flex-shrink-0 overflow-hidden" style={{ minHeight: '260px' }}>
                  {ctaPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ctaPhoto} alt={doctor.name}
                      className="w-full h-full object-cover object-top" style={{ minHeight: '260px' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20" style={{ minHeight: '260px' }}>
                      <span className="text-white text-8xl font-bold">{initials}</span>
                    </div>
                  )}
                </div>

                {/* Texto + formulario */}
                <div className="flex-1 p-6 md:p-10 flex flex-col justify-center">
                  <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-2">Atención personalizada</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">¿Listo para cuidar tu salud?</h2>
                  <p className="text-white/70 text-sm mb-4 max-w-md leading-relaxed">
                    Deja tus datos y {firstName} o su equipo se pondrán en contacto contigo a la brevedad para coordinar tu cita.
                  </p>
                  <Link
                    href={`/${params.slug}/reservar`}
                    className="inline-flex items-center justify-center gap-2 w-full bg-white text-primary font-bold py-3.5 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg mb-4 text-sm"
                  >
                    📅 Reservar cita en línea →
                  </Link>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 md:p-6 shadow-lg">
                    <DoctorContactForm slug={params.slug} doctorName={displayName} />
                  </div>
                </div>

              </div>
            </section>
          )
        })()}

      </main>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-6 text-center text-gray-400 dark:text-gray-600 text-xs">
        <p>Página gestionada con <a href="https://www.consultorio.site" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-500 hover:text-blue-600 transition-colors">consultorio.site</a></p>
      </footer>

      {/* ── FLOATING ACTIONS (dark mode toggle + scroll to top) ── */}
      <PublicPageActions />

      {/* ── DOCTOR CHAT WIDGET ────────────────────────────── */}
      <DoctorChatWidget
        slug={params.slug}
        doctorName={displayName}
        doctorAvatar={doctor.avatarUrl}
      />
    </div>
  )
}
