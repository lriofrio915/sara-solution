'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SaraLogo from '@/components/SaraLogo'
import PhoneInput from '@/components/PhoneInput'

type Step = 1 | 2 | 3

interface FormData {
  bio: string
  whatsapp: string
  phone: string
  address: string
  schedules: string
  services: string
}

const STEPS = [
  { id: 1, label: 'Tu perfil', icon: '👤' },
  { id: 2, label: 'Página pública', icon: '🌐' },
  { id: 3, label: '¡Listo!', icon: '🎉' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doctorName, setDoctorName] = useState('')
  const [slug, setSlug] = useState('')

  const [form, setForm] = useState<FormData>({
    bio: '',
    whatsapp: '',
    phone: '',
    address: '',
    schedules: '',
    services: '',
  })

  // Load current profile to check if bio exists (skip if already complete)
  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        setDoctorName(data.name ?? '')
        setSlug(data.slug ?? '')
        setForm({
          bio: data.bio ?? '',
          whatsapp: data.whatsapp ?? '',
          phone: data.phone ?? '',
          address: data.address ?? '',
          schedules: data.schedules ?? '',
          services: data.services ?? '',
        })
        // If bio already set, skip to dashboard
        if (data.bio) {
          router.replace('/dashboard')
        }
      })
      .catch(() => {})
  }, [router])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function saveStep1() {
    if (!form.bio.trim()) {
      setError('La bio es requerida para continuar')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: form.bio,
          whatsapp: form.whatsapp,
          phone: form.phone,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setStep(2)
    } catch {
      setError('Error guardando el perfil. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function saveStep2() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: form.address,
          schedules: form.schedules,
          services: form.services,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setStep(3)
    } catch {
      setError('Error guardando los datos. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const publicUrl = slug ? `${appUrl}/${slug}` : ''
  const firstName = doctorName.split(' ')[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8">
        <SaraLogo />
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                step === s.id
                  ? 'bg-primary text-white shadow-md'
                  : step > s.id
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              <span>{step > s.id ? '✓' : s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 transition-colors ${
                  step > s.id ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-lg p-8">
        {/* ─── Step 1: Perfil ─── */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {firstName ? `Bienvenido, ${firstName}` : 'Bienvenido a MedSara'} 👋
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Completa tu perfil profesional. Esta info aparecerá en tu página pública.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Bio profesional <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Ej: Especialista en Medicina Interna con más de 15 años de experiencia. Me dedico a la atención integral de pacientes adultos con un enfoque humano y personalizado."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
                <p className="text-gray-400 text-xs mt-1">Visible en tu página pública para los pacientes.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#25D366]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </span>
                  <PhoneInput
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={handleChange}
                    placeholder="+593 99 812 3456"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <p className="text-gray-400 text-xs mt-1">Los pacientes podrán contactarte directamente por WhatsApp.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Teléfono de contacto
                </label>
                <PhoneInput
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+593 99 212 3456"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
            </div>

            <button
              onClick={saveStep1}
              disabled={saving}
              className="w-full mt-6 bg-gradient-to-r from-primary to-secondary text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
            >
              {saving ? 'Guardando...' : 'Continuar →'}
            </button>
          </div>
        )}

        {/* ─── Step 2: Página pública ─── */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Tu página pública 🌐</h1>
            <p className="text-gray-500 text-sm mb-6">
              Configura los datos que verán tus pacientes al visitar tu página.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Dirección del consultorio
                </label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Ej: Hospital San Mateo, Puyo - Pastaza"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Horarios de atención
                </label>
                <textarea
                  name="schedules"
                  value={form.schedules}
                  onChange={handleChange}
                  rows={3}
                  placeholder={'Lunes a Viernes: 8:00 - 17:00\nSábados: 8:00 - 12:00\nEmergencias: disponible'}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
                <p className="text-gray-400 text-xs mt-1">Una línea por horario.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Servicios que ofreces
                </label>
                <textarea
                  name="services"
                  value={form.services}
                  onChange={handleChange}
                  rows={4}
                  placeholder={'Consulta de Medicina Interna\nTeleconsulta\nAtención Domiciliaria\nChequeo Preventivo\nElectrocardiograma'}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
                <p className="text-gray-400 text-xs mt-1">Un servicio por línea. Se mostrarán como tarjetas en tu página.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                ← Atrás
              </button>
              <button
                onClick={saveStep2}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
              >
                {saving ? 'Guardando...' : 'Finalizar →'}
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Listo ─── */}
        {step === 3 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-4xl mx-auto mb-5 shadow-lg">
              🎉
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Todo listo!</h1>
            <p className="text-gray-500 text-sm mb-6">
              Tu perfil está configurado. Ahora tus pacientes pueden encontrarte y agendar citas en línea.
            </p>

            {publicUrl && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 text-left">
                <p className="text-xs text-blue-600 font-semibold mb-1">Tu página pública:</p>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 font-mono text-sm break-all hover:underline"
                >
                  {publicUrl}
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-6">
              {publicUrl && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition-colors text-sm"
                >
                  🌐 Ver página
                </a>
              )}
              {publicUrl && (
                <a
                  href={`${publicUrl}/chat`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition-colors text-sm"
                >
                  💬 Probar chat
                </a>
              )}
            </div>

            <button
              onClick={() => router.replace('/dashboard')}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-lg"
            >
              Ir al Dashboard →
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-gray-400 text-xs text-center">
        Puedes actualizar esta información en cualquier momento desde{' '}
        <a href="/profile" className="text-primary hover:underline">
          Mi Perfil
        </a>
        .
      </p>
    </div>
  )
}
