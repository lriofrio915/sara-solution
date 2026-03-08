'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'

interface DoctorProfile {
  id: string
  slug: string
  name: string
  specialty: string
  email: string
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  address: string | null
  whatsapp: string | null
  schedules: string | null
}

interface DaySchedule {
  weekday: number
  startTime: string
  endTime: string
  isActive: boolean
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DURATION_OPTIONS = [15, 20, 30, 45, 60]

const DEFAULT_SCHEDULE: DaySchedule[] = DAYS.map((_, weekday) => ({
  weekday,
  startTime: '09:00',
  endTime: '17:00',
  isActive: weekday >= 1 && weekday <= 5, // Mon–Fri active by default
}))

export default function ProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [form, setForm] = useState({
    name: '',
    specialty: '',
    phone: '',
    bio: '',
    address: '',
    whatsapp: '',
    slug: '',
  })
  const [copied, setCopied] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingAvail, setSavingAvail] = useState(false)
  const [success, setSuccess] = useState(false)
  const [availSuccess, setAvailSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Availability state
  const [appointmentDuration, setAppointmentDuration] = useState(30)
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data: DoctorProfile) => {
        setProfile(data)
        setAvatarUrl(data.avatarUrl)
        setForm({
          name: data.name ?? '',
          specialty: data.specialty ?? '',
          phone: data.phone ?? '',
          bio: data.bio ?? '',
          address: data.address ?? '',
          whatsapp: data.whatsapp ?? '',
          slug: data.slug ?? '',
        })
      })
      .catch(() => setError('Error cargando perfil'))

    fetch('/api/availability')
      .then((r) => r.json())
      .then((data: { appointmentDuration: number; schedules: DaySchedule[] }) => {
        if (data.appointmentDuration) setAppointmentDuration(data.appointmentDuration)
        if (data.schedules && data.schedules.length > 0) {
          // Merge fetched schedules into the full 7-day array
          setWeekSchedule(
            DEFAULT_SCHEDULE.map((def) => {
              const found = data.schedules.find((s) => s.weekday === def.weekday)
              return found ?? def
            })
          )
        }
      })
      .catch(() => {/* availability not critical */})
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    const sanitized = name === 'slug'
      ? value.toLowerCase().replace(/[^a-z0-9-]/g, '')
      : value
    setForm((prev) => ({ ...prev, [name]: sanitized }))
  }

  function handleDayToggle(weekday: number) {
    setWeekSchedule((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, isActive: !d.isActive } : d))
    )
  }

  function handleDayTime(weekday: number, field: 'startTime' | 'endTime', value: string) {
    setWeekSchedule((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, [field]: value } : d))
    )
  }

  async function copyLink() {
    const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/${form.slug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${profile.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setAvatarUrl(url)

      // Auto-guardar el URL en la DB inmediatamente
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setError(`Error al subir la imagen: ${msg}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, avatarUrl, slug: form.slug }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar')
      }

      const updated: DoctorProfile = await res.json()
      setProfile(updated)
      setForm((prev) => ({ ...prev, slug: updated.slug }))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAvailability() {
    setSavingAvail(true)
    setError(null)
    setAvailSuccess(false)

    try {
      const res = await fetch('/api/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentDuration, schedules: weekSchedule }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar horarios')
      }

      setAvailSuccess(true)
      setTimeout(() => setAvailSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar horarios')
    } finally {
      setSavingAvail(false)
    }
  }

  if (!profile) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const initials = getInitials(form.name || profile.name)

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Actualiza tu información profesional</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm flex items-center gap-2">
          <span>✓</span> Perfil actualizado correctamente
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Foto de perfil</h2>
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-2xl shadow-md">
                  {initials}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {uploading ? 'Subiendo...' : 'Cambiar foto'}
              </button>
              <p className="text-gray-400 text-xs mt-1.5">JPG, PNG o WebP. Máx 5 MB.</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>
        </div>

        {/* Info básica */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Información profesional</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nombre completo
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Especialidad
            </label>
            <input
              type="text"
              name="specialty"
              value={form.specialty}
              onChange={handleChange}
              required
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Bio / Descripción
            </label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={3}
              placeholder="Breve descripción profesional que verán tus pacientes..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
            />
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Contacto</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="input opacity-60 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
            />
            <p className="text-gray-400 text-xs mt-1">El email no se puede cambiar aquí</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Teléfono
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+593 998 176 580"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              WhatsApp
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#25D366] text-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </span>
              <input
                type="tel"
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
                placeholder="+593 998 176 580"
                className="input pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Dirección / Consultorio
            </label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Av. Principal 123, Consultorio 4B, Ciudad"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Página pública */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Tu página pública</h2>
            <p className="text-gray-400 text-xs mt-0.5">Comparte este link con tus pacientes para que puedan agendar citas.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nombre de tu página
            </label>
            <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition">
              <span className="px-3 py-3 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm border-r border-gray-200 dark:border-gray-600 whitespace-nowrap">
                consultorio.site/
              </span>
              <input
                type="text"
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="dra-medrano"
                className="flex-1 px-3 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none placeholder-gray-400"
              />
            </div>
            <p className="text-gray-400 text-xs mt-1">Solo letras minúsculas, números y guiones. Mín. 3 caracteres.</p>
          </div>

          {form.slug && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
              <p className="text-xs text-blue-500 font-semibold mb-2 uppercase tracking-wide">Tu link público</p>
              <div className="flex items-center gap-2">
                <a
                  href={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/${form.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-blue-700 dark:text-blue-400 text-sm font-mono truncate hover:underline"
                >
                  {`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/${form.slug}`}
                </a>
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex-shrink-0 px-3 py-1.5 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-400 mb-2">Compartir en:</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/${form.slug}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1877F2] hover:bg-[#1664d8] text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'}/${form.slug}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A66C2] hover:bg-[#0958a8] text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] hover:opacity-90 text-white rounded-lg text-xs font-semibold transition-opacity"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    Instagram
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-2">* Instagram copia el link al portapapeles.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* ── HORARIO DE ATENCIÓN ─────────────────────────────── */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Horario de atención</h2>
          <p className="text-gray-400 text-xs mt-0.5">
            Sara usará este horario para verificar disponibilidad real y agendar citas automáticamente.
          </p>
        </div>

        {availSuccess && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm flex items-center gap-2">
            <span>✓</span> Horarios guardados correctamente
          </div>
        )}

        {/* Duración de cita */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Duración por cita
          </label>
          <div className="flex gap-2 flex-wrap">
            {DURATION_OPTIONS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setAppointmentDuration(min)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  appointmentDuration === min
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
        </div>

        {/* Días de la semana */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Días y horarios</p>
          {weekSchedule.map((day) => (
            <div key={day.weekday} className={`flex flex-wrap items-center gap-x-3 gap-y-2 p-3 rounded-xl border transition-colors ${
              day.isActive
                ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30'
            }`}>
              {/* Toggle */}
              <button
                type="button"
                onClick={() => handleDayToggle(day.weekday)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                  day.isActive ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  day.isActive ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>

              {/* Day name */}
              <span className={`w-24 text-sm font-medium ${
                day.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {DAYS[day.weekday]}
              </span>

              {/* Time inputs */}
              {day.isActive ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={day.startTime}
                    onChange={(e) => handleDayTime(day.weekday, 'startTime', e.target.value)}
                    className="w-[94px] px-1.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="text-gray-400 text-sm flex-shrink-0">–</span>
                  <input
                    type="time"
                    value={day.endTime}
                    onChange={(e) => handleDayTime(day.weekday, 'endTime', e.target.value)}
                    className="w-[94px] px-1.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="text-xs text-gray-400 hidden sm:block">
                    ({Math.floor((
                      (parseInt(day.endTime.split(':')[0]) * 60 + parseInt(day.endTime.split(':')[1])) -
                      (parseInt(day.startTime.split(':')[0]) * 60 + parseInt(day.startTime.split(':')[1]))
                    ) / appointmentDuration)} slots)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">Cerrado</span>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSaveAvailability}
          disabled={savingAvail}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {savingAvail ? 'Guardando...' : 'Guardar horarios'}
        </button>
      </div>
    </div>
  )
}
