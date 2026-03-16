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
  branches: string | null
}

interface Branch {
  name: string
  address: string
}

interface DaySchedule {
  weekday: number
  startTime: string
  endTime: string
  isActive: boolean
  location?: string
}

interface TimeSlot {
  startTime: string
  endTime: string
  location: string
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
// Display order: Lunes → Sábado → Domingo
const DISPLAY_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DURATION_OPTIONS = [15, 20, 30, 45, 60]

const DEFAULT_SLOT: TimeSlot = { startTime: '09:00', endTime: '17:00', location: '' }
const DEFAULT_ACTIVE_DAYS = new Set([1, 2, 3, 4, 5])
const DEFAULT_DAY_SLOTS: Record<number, TimeSlot[]> = {
  1: [{ ...DEFAULT_SLOT }],
  2: [{ ...DEFAULT_SLOT }],
  3: [{ ...DEFAULT_SLOT }],
  4: [{ ...DEFAULT_SLOT }],
  5: [{ ...DEFAULT_SLOT }],
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [form, setForm] = useState({
    name: '',
    specialty: '',
    phone: '',
    bio: '',
    address: '',
    whatsapp: '',
    webhookUrl: '',
    slug: '',
  })
  const [branches, setBranches] = useState<Branch[]>([])
  const [copied, setCopied] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingAvail, setSavingAvail] = useState(false)
  const [success, setSuccess] = useState(false)
  const [availSuccess, setAvailSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showDeleteZone, setShowDeleteZone] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Availability state
  const [appointmentDuration, setAppointmentDuration] = useState(30)
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set(DEFAULT_ACTIVE_DAYS))
  const [daySlots, setDaySlots] = useState<Record<number, TimeSlot[]>>(DEFAULT_DAY_SLOTS)

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
          webhookUrl: (data as any).webhookUrl ?? '',
          slug: data.slug ?? '',
        })
        try {
          setBranches(data.branches ? JSON.parse(data.branches) : [])
        } catch {
          setBranches([])
        }
      })
      .catch(() => setError('Error cargando perfil'))

    fetch('/api/availability')
      .then((r) => r.json())
      .then((data: { appointmentDuration: number; schedules: DaySchedule[] }) => {
        if (data.appointmentDuration) setAppointmentDuration(data.appointmentDuration)
        if (data.schedules && data.schedules.length > 0) {
          const days = new Set<number>()
          const slots: Record<number, TimeSlot[]> = {}
          for (const s of data.schedules) {
            if (s.isActive) {
              days.add(s.weekday)
              if (!slots[s.weekday]) slots[s.weekday] = []
              slots[s.weekday].push({
                startTime: s.startTime,
                endTime: s.endTime,
                location: s.location ?? '',
              })
            }
          }
          if (days.size > 0) {
            setActiveDays(days)
            setDaySlots(slots)
          }
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
    setActiveDays((prev) => {
      const next = new Set(prev)
      if (next.has(weekday)) {
        next.delete(weekday)
      } else {
        next.add(weekday)
        // Ensure there's at least one slot for this day
        setDaySlots((s) => ({ ...s, [weekday]: s[weekday]?.length ? s[weekday] : [{ ...DEFAULT_SLOT }] }))
      }
      return next
    })
  }

  function handleSlotChange(weekday: number, index: number, field: keyof TimeSlot, value: string) {
    setDaySlots((prev) => {
      const slots = [...(prev[weekday] ?? [])]
      slots[index] = { ...slots[index], [field]: value }
      return { ...prev, [weekday]: slots }
    })
  }

  function addSlot(weekday: number) {
    setDaySlots((prev) => ({
      ...prev,
      [weekday]: [...(prev[weekday] ?? []), { ...DEFAULT_SLOT }],
    }))
  }

  function removeSlot(weekday: number, index: number) {
    setDaySlots((prev) => {
      const slots = (prev[weekday] ?? []).filter((_, i) => i !== index)
      return { ...prev, [weekday]: slots.length ? slots : [{ ...DEFAULT_SLOT }] }
    })
  }

  function addBranch() {
    setBranches((prev) => [...prev, { name: '', address: '' }])
  }

  function removeBranch(index: number) {
    setBranches((prev) => prev.filter((_, i) => i !== index))
  }

  function updateBranch(index: number, field: 'name' | 'address', value: string) {
    setBranches((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)))
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
        body: JSON.stringify({
          ...form,
          avatarUrl,
          slug: form.slug,
          branches: branches.length > 0 ? JSON.stringify(branches.filter((b) => b.address.trim())) : null,
        }),
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
      // Build flat DaySchedule[] from multi-slot state
      const schedules: DaySchedule[] = []
      for (const weekday of DISPLAY_WEEKDAY_ORDER) {
        if (activeDays.has(weekday)) {
          const slots = daySlots[weekday] ?? [{ ...DEFAULT_SLOT }]
          for (const slot of slots) {
            schedules.push({ weekday, startTime: slot.startTime, endTime: slot.endTime, isActive: true, location: slot.location })
          }
        } else {
          schedules.push({ weekday, startTime: '09:00', endTime: '17:00', isActive: false })
        }
      }
      const res = await fetch('/api/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentDuration, schedules }),
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

  // Opciones de ubicación: principal + sucursales
  const locationOptions = [
    ...(form.address ? [{ label: form.address, value: form.address }] : []),
    ...branches
      .filter((b) => b.address.trim())
      .map((b) => ({ label: b.name ? `${b.name} — ${b.address}` : b.address, value: b.address })),
  ]

  return (
    <div className="p-6 md:p-8 md:pt-10 max-w-3xl">
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
              WhatsApp Personal
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+593 99 123 4567"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
            <p className="text-gray-400 text-xs mt-1">Tu número personal — no se muestra públicamente</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              WhatsApp Business — Agente Sara IA
            </label>
            <p className="text-gray-400 text-xs mb-1.5">Número donde vive el agente Sara IA que atiende y agenda a tus pacientes</p>
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
              Consultorio principal
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

          {/* Sucursales adicionales */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sucursales adicionales <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <p className="text-gray-400 text-xs mt-0.5">Si atiendes en varios centros, clínicas u hospitales</p>
              </div>
              <button
                type="button"
                onClick={addBranch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Añadir sucursal
              </button>
            </div>

            {branches.length === 0 && (
              <p className="text-xs text-gray-400 italic py-2">Sin sucursales — los pacientes serán agendados en el consultorio principal.</p>
            )}

            <div className="space-y-3">
              {branches.map((branch, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-semibold w-5">#{i + 1}</span>
                    <input
                      type="text"
                      value={branch.name}
                      onChange={(e) => updateBranch(i, 'name', e.target.value)}
                      placeholder="Nombre del lugar (ej. Hospital del Sur)"
                      className="flex-1 input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeBranch(i)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5" />
                    <input
                      type="text"
                      value={branch.address}
                      onChange={(e) => updateBranch(i, 'address', e.target.value)}
                      placeholder="Dirección completa"
                      className="flex-1 input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                </div>
              ))}
            </div>
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
          {DISPLAY_WEEKDAY_ORDER.map((weekday) => {
            const isActive = activeDays.has(weekday)
            const slots = daySlots[weekday] ?? []
            return (
              <div key={weekday} className={`p-3 rounded-xl border transition-colors ${
                isActive
                  ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30'
              }`}>
                {/* Day header row */}
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => handleDayToggle(weekday)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                      isActive ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      isActive ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>

                  {/* Day name */}
                  <span className={`w-24 flex-shrink-0 text-sm font-medium ${
                    isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {DAYS[weekday]}
                  </span>

                  {/* Closed label or add-slot button */}
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => addSlot(weekday)}
                      className="ml-auto flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Turno
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Cerrado</span>
                  )}
                </div>

                {/* Slots */}
                {isActive && (
                  <div className="mt-2 space-y-2 pl-12">
                    {slots.map((slot, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleSlotChange(weekday, i, 'startTime', e.target.value)}
                          className="w-[94px] px-1.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <span className="text-gray-400 text-sm flex-shrink-0">–</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleSlotChange(weekday, i, 'endTime', e.target.value)}
                          className="w-[94px] px-1.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        {locationOptions.length > 0 && (
                          <select
                            value={slot.location}
                            onChange={(e) => handleSlotChange(weekday, i, 'location', e.target.value)}
                            className="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="">📍 Centro (opcional)</option>
                            {locationOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                        {slots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSlot(weekday, i)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Eliminar turno"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
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

      {/* ── ZONA DE PELIGRO ─────────────────────────────── */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/40 p-6">
        <button
          type="button"
          onClick={() => setShowDeleteZone((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <h2 className="font-semibold text-red-600 dark:text-red-400">Zona de peligro</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Acciones irreversibles sobre tu cuenta</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round"
            className={`text-gray-400 transition-transform ${showDeleteZone ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {showDeleteZone && (
          <div className="mt-5 space-y-4 pt-4 border-t border-red-100 dark:border-red-900/30">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Eliminar cuenta y todos mis datos</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed">
                Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán tu cuenta, todos tus pacientes, citas, recetas, historiales clínicos y cualquier dato asociado.
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">
                Escribe tu correo electrónico para confirmar: <strong>{profile.email}</strong>
              </label>
              <input
                type="email"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={profile.email}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <button
              type="button"
              disabled={deleteConfirm !== profile.email || deleting}
              onClick={async () => {
                setDeleting(true)
                const res = await fetch('/api/profile', { method: 'DELETE' })
                if (res.ok) {
                  window.location.href = '/'
                } else {
                  const data = await res.json()
                  setError(data.error ?? 'Error al eliminar cuenta')
                  setDeleting(false)
                }
              }}
              className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? 'Eliminando...' : 'Eliminar mi cuenta permanentemente'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
