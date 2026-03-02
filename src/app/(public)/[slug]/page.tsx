import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

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
    select: { name: true, specialty: true, bio: true },
  })
  if (!doctor) return { title: 'Médico no encontrado' }
  return {
    title: `${doctor.name} | ${doctor.specialty}`,
    description: doctor.bio ?? `Agenda tu cita con ${doctor.name}, especialista en ${doctor.specialty}.`,
  }
}

export default async function DoctorPublicPage({ params }: Props) {
  const doctor = await prisma.doctor.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      name: true,
      specialty: true,
      bio: true,
      avatarUrl: true,
      address: true,
      whatsapp: true,
      schedules: true,
      services: true,
      phone: true,
    },
  })

  if (!doctor) notFound()

  const initials = getInitials(doctor.name)

  // Parse services (newline-separated)
  const servicesList = doctor.services
    ? doctor.services.split('\n').map((s) => s.trim()).filter(Boolean)
    : []

  // Parse schedules (newline-separated)
  const scheduleLines = doctor.schedules
    ? doctor.schedules.split('\n').map((s) => s.trim()).filter(Boolean)
    : []

  const whatsappNumber = doctor.whatsapp ? doctor.whatsapp.replace(/\D/g, '') : null
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=Hola+${encodeURIComponent(doctor.name)}%2C+me+gustar%C3%ADa+agendar+una+cita`
    : null

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 100%)' }}>
      {/* Sticky header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {doctor.avatarUrl ? (
              <img
                src={doctor.avatarUrl}
                alt={doctor.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
              >
                {initials}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">{doctor.name}</p>
              <p className="text-blue-600 text-xs font-medium">{doctor.specialty}</p>
            </div>
          </div>
          <Link
            href={`/${params.slug}/chat`}
            className="text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
          >
            Agendar cita
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <section className="text-center mb-14">
          <div className="flex justify-center mb-6">
            {doctor.avatarUrl ? (
              <img
                src={doctor.avatarUrl}
                alt={doctor.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
              />
            ) : (
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-xl border-4 border-white"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
              >
                {initials}
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{doctor.name}</h1>
          <p className="text-blue-600 font-semibold text-lg mb-5">{doctor.specialty}</p>

          {doctor.bio && (
            <p className="text-gray-600 max-w-xl mx-auto leading-relaxed text-base">{doctor.bio}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              href={`/${params.slug}/chat`}
              className="flex items-center justify-center gap-2 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:opacity-90 transition-all hover:-translate-y-0.5 text-base"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
            >
              <span>📅</span>
              Agendar mi cita con Sara
            </Link>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold px-8 py-4 rounded-2xl shadow-lg transition-all hover:-translate-y-0.5 text-base"
              >
                <WhatsAppIcon size={20} />
                WhatsApp
              </a>
            )}
          </div>
        </section>

        {/* Info cards */}
        {(scheduleLines.length > 0 || doctor.address) && (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {scheduleLines.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-xl">🕐</span>
                  Horarios de atención
                </h2>
                <ul className="space-y-2">
                  {scheduleLines.map((line, i) => (
                    <li key={i} className="text-gray-600 text-sm flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {doctor.address && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-xl">📍</span>
                  Ubicación
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-3">{doctor.address}</p>
                {doctor.phone && (
                  <a
                    href={`tel:${doctor.phone}`}
                    className="flex items-center gap-2 text-gray-600 text-sm hover:text-blue-600 transition-colors"
                  >
                    <span>📞</span>
                    {doctor.phone}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Services */}
        {servicesList.length > 0 && (
          <section className="mb-12">
            <h2 className="font-bold text-gray-900 text-2xl mb-6 text-center">Servicios</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {servicesList.map((service, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center hover:shadow-md hover:border-blue-100 transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 text-xl"
                    style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 100%)' }}
                  >
                    ⚕️
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{service}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA section */}
        <section
          className="rounded-3xl p-10 text-center text-white mb-8"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
        >
          <div className="text-4xl mb-3">✨</div>
          <h2 className="text-2xl font-bold mb-3">¿Listo para cuidar tu salud?</h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            Agenda tu cita ahora mismo. Mi asistente Sara te atenderá al instante, los 7 días de la semana.
          </p>
          <Link
            href={`/${params.slug}/chat`}
            className="inline-flex items-center gap-2 bg-white font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg text-blue-600"
          >
            <span>💬</span>
            Hablar con Sara
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-6 text-center text-gray-400 text-xs">
        <p>Asistente médico potenciado por Sara IA · MedSara</p>
      </footer>

      {/* WhatsApp float */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 group"
        >
          <WhatsAppIcon size={28} />
          <span className="absolute right-16 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Escríbenos
          </span>
        </a>
      )}
    </div>
  )
}
