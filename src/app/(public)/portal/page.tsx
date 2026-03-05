'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import SaraLogo from '@/components/SaraLogo'
import { formatDateTime } from '@/lib/utils'

const appointmentTypeLabel: Record<string, string> = {
  IN_PERSON: 'Presencial',
  TELECONSULT: 'Teleconsulta',
  HOME_VISIT: 'Domicilio',
  EMERGENCY: 'Urgencia',
  FOLLOW_UP: 'Seguimiento',
}

interface Appointment {
  id: string
  date: string
  type: string
  status: string
  reason: string | null
  duration: number
  location: string | null
}

interface DoctorInfo {
  name: string
  specialty: string
  avatarUrl: string | null
  whatsapp: string | null
  phone: string | null
  schedules: string | null
  address: string | null
}

interface PatientData {
  patientName: string
  doctor: DoctorInfo
  appointments: Appointment[]
}

type PortalResult =
  | { found: false }
  | { found: true; data: PatientData[] }

export default function PatientPortalPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PortalResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/patient-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error buscando citas')
      }

      const data: PortalResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <SaraLogo size="sm" />
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            Soy médico →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl mx-auto mb-5 shadow-lg">
            📅
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Portal del Paciente</h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Ingresa tu correo electrónico para ver tus citas programadas.
          </p>
        </div>

        {/* Search form */}
        {!result?.found && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-60 text-sm"
                >
                  {loading ? 'Buscando...' : 'Ver mis citas'}
                </button>
              </form>

              {result && !result.found && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                  <p className="font-medium mb-1">No encontramos citas para ese correo</p>
                  <p className="text-yellow-700">
                    Verifica que el correo sea el mismo que usaste al agendar con tu médico.
                    También puedes contactarlo directamente.
                  </p>
                  <Link
                    href="/buscar-medico"
                    className="mt-2 inline-block text-yellow-900 font-semibold underline"
                  >
                    Buscar mi médico →
                  </Link>
                </div>
              )}
            </div>

            <p className="text-center text-gray-400 text-sm mt-6">
              ¿Quieres agendar con un médico?{' '}
              <Link href="/buscar-medico" className="text-primary font-medium hover:underline">
                Buscar médico
              </Link>
            </p>
          </div>
        )}

        {/* Results */}
        {result?.found && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Tus citas programadas
              </h2>
              <button
                onClick={() => { setResult(null); setEmail('') }}
                className="text-sm text-gray-400 hover:text-gray-600 underline"
              >
                Buscar con otro correo
              </button>
            </div>

            {result.data.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Doctor header */}
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-4">
                    {item.doctor.avatarUrl ? (
                      <Image
                        src={item.doctor.avatarUrl}
                        alt={item.doctor.name}
                        width={52}
                        height={52}
                        className="w-13 h-13 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-13 h-13 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                        {item.doctor.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-lg">{item.doctor.name}</p>
                      <p className="text-primary text-sm font-medium">{item.doctor.specialty}</p>
                      <p className="text-gray-500 text-sm">{item.patientName}</p>
                    </div>
                    {item.doctor.whatsapp && (
                      <a
                        href={`https://wa.me/${item.doctor.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, soy paciente y quiero consultar sobre mi cita.')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-semibold rounded-xl text-sm transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        Contactar
                      </a>
                    )}
                  </div>

                  {/* Doctor details */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {item.doctor.address && (
                      <div className="flex items-start gap-2 text-gray-500">
                        <span className="mt-0.5">📍</span>
                        <span>{item.doctor.address}</span>
                      </div>
                    )}
                    {item.doctor.schedules && (
                      <div className="flex items-start gap-2 text-gray-500">
                        <span className="mt-0.5">🕐</span>
                        <span className="whitespace-pre-line">{item.doctor.schedules}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Appointments */}
                <div className="p-6">
                  {item.appointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-3xl mb-2">📅</p>
                      <p className="text-sm">No tienes citas próximas programadas</p>
                      {item.doctor.whatsapp && (
                        <a
                          href={`https://wa.me/${item.doctor.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, me gustaría agendar una cita.')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block text-[#128C7E] font-semibold text-sm underline"
                        >
                          Agendar por WhatsApp →
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-700 text-sm mb-3">
                        Próximas citas ({item.appointments.length})
                      </h3>
                      {item.appointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100"
                        >
                          <div className="text-center min-w-[72px]">
                            <p className="font-bold text-primary text-sm">
                              {new Date(apt.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {new Date(apt.date).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">
                              {appointmentTypeLabel[apt.type] ?? apt.type}
                              {` · ${apt.duration} min`}
                            </p>
                            {apt.reason && (
                              <p className="text-gray-400 text-xs truncate">{apt.reason}</p>
                            )}
                            {apt.location && (
                              <p className="text-gray-400 text-xs">📍 {apt.location}</p>
                            )}
                          </div>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                              apt.status === 'CONFIRMED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {apt.status === 'CONFIRMED' ? 'Confirmada' : 'Programada'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
