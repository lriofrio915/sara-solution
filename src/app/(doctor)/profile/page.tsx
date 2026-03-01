'use client'

import type { Metadata } from 'next'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'

interface DoctorProfile {
  id: string
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

export default function ProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [form, setForm] = useState({
    name: '',
    specialty: '',
    phone: '',
    bio: '',
    address: '',
    whatsapp: '',
    schedules: '',
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
          schedules: data.schedules ?? '',
        })
      })
      .catch(() => setError('Error cargando perfil'))
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `avatars/${profile.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setAvatarUrl(url)
    } catch (err) {
      setError('Error al subir la imagen. Asegúrate de que el bucket "avatars" existe en Supabase Storage.')
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
        body: JSON.stringify({ ...form, avatarUrl }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar')
      }

      const updated: DoctorProfile = await res.json()
      setProfile(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar perfil')
    } finally {
      setSaving(false)
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
    <div className="p-8 max-w-3xl">
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
        </div>

        {/* Horarios y ubicación */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Horarios y ubicación</h2>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Horarios de atención
            </label>
            <textarea
              name="schedules"
              value={form.schedules}
              onChange={handleChange}
              rows={3}
              placeholder="Lunes a Viernes: 8:00 - 17:00&#10;Sábados: 8:00 - 12:00&#10;Domingos: cerrado"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
            />
          </div>
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
    </div>
  )
}
