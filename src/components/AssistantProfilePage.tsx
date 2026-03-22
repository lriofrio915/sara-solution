'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import PhoneInput from '@/components/PhoneInput'
import { User, Building2, PenLine, CheckCircle, AlertCircle, PenSquare } from 'lucide-react'

interface DoctorInfo {
  id: string
  name: string
  specialty: string
  email: string
  phone: string | null
  avatarUrl: string | null
  address: string | null
  establishmentName: string | null
}

interface MemberData {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  role: string
  canSign: boolean
  createdAt: string
  doctor: DoctorInfo
}

export default function AssistantProfilePage({ initialMember }: { initialMember: MemberData }) {
  const [member, setMember] = useState<MemberData>(initialMember)
  const [form, setForm] = useState({
    name: initialMember.name,
    phone: initialMember.phone ?? '',
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialMember.avatarUrl)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `assistants/${member.id}/avatar-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadErr) throw new Error(uploadErr.message)
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl
      setAvatarUrl(url)
      // Save immediately
      await fetch('/api/assistant/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/assistant/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          avatarUrl,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error al guardar')
      }
      const { member: updated } = await res.json()
      setMember(prev => ({ ...prev, ...updated }))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const initials = getInitials(member.name)
  const doctorInitials = getInitials(member.doctor.name)

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <User size={22} className="text-primary" />
          Mi Perfil
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Información personal de tu cuenta de asistente.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl px-4 py-3 text-sm">
          <CheckCircle size={16} /> Perfil actualizado correctamente.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Avatar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-4">
            Foto de perfil
          </h2>
          <div className="flex items-center gap-5">
            <div className="relative group">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={member.name}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <PenSquare size={18} className="text-white" />
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
              >
                {uploading ? 'Subiendo...' : 'Cambiar foto'}
              </button>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">JPG, PNG o WebP. Máx 2 MB.</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
            Información personal
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nombre completo
            </label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white w-full"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={member.email}
              disabled
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white w-full opacity-60 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">El email no se puede modificar.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Teléfono
            </label>
            <PhoneInput
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+593 99 900 0000"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500 w-full"
            />
          </div>

          {/* Signature permission badge */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
            member.canSign
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
          }`}>
            <PenLine size={16} className={member.canSign ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
            <div>
              <p className={`font-medium ${member.canSign ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-slate-300'}`}>
                {member.canSign ? 'Tienes permiso para firmar documentos' : 'Sin permiso de firma digital'}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {member.canSign
                  ? 'La doctora autorizó que puedas aplicar la firma electrónica.'
                  : 'La doctora aún no ha autorizado la firma digital para tu cuenta.'}
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {/* Doctor info (read-only) */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-4 flex items-center gap-2">
          <Building2 size={14} />
          Consultorio al que perteneces
        </h2>
        <div className="flex items-center gap-4">
          {member.doctor.avatarUrl ? (
            <Image
              src={member.doctor.avatarUrl}
              alt={member.doctor.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {doctorInitials}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{member.doctor.name}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{member.doctor.specialty}</p>
            {member.doctor.establishmentName && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{member.doctor.establishmentName}</p>
            )}
            {member.doctor.address && (
              <p className="text-xs text-gray-400 dark:text-slate-500">{member.doctor.address}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
