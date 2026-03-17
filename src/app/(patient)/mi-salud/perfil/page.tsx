'use client'

import { useState, useEffect } from 'react'

interface PatientProfile {
  name: string
  email: string | null
  phone: string | null
  birthDate: string | null
  bloodType: string
  allergies: string[]
  documentId: string | null
  doctor: { name: string; specialty: string; avatarUrl: string | null }
}

const BLOOD_LABELS: Record<string, string> = {
  UNKNOWN: '—', A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

export default function PatientPerfilPage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteZone, setShowDeleteZone] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/patient/me')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data)
        setPhone(data.phone ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/patient/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      if (res.ok) {
        const updated = await res.json()
        setProfile((p) => p ? { ...p, phone: updated.phone } : p)
        setEditing(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center pt-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
  if (!profile) return null

  const age = profile.birthDate
    ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div className="space-y-5 pb-20 sm:pb-0">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">👤 Mi Perfil</h1>

      {saved && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm">
          ✓ Cambios guardados correctamente
        </div>
      )}

      {/* Personal info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
            Información personal
          </h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline font-medium">
              Editar teléfono
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="text-xs bg-primary text-white px-3 py-1 rounded-lg font-medium disabled:opacity-60">
                {saving ? '...' : 'Guardar'}
              </button>
              <button onClick={() => { setEditing(false); setPhone(profile.phone ?? '') }}
                className="text-xs border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-lg">
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Nombre completo" value={profile.name} />
          <InfoRow label="Correo electrónico" value={profile.email} />
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-400 mb-1">Teléfono</p>
            {editing ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 0999123456"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            ) : (
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{profile.phone || '—'}</p>
            )}
          </div>
          <InfoRow label="Cédula / Pasaporte" value={profile.documentId} />
          <InfoRow
            label="Fecha de nacimiento"
            value={profile.birthDate
              ? `${new Date(profile.birthDate).toLocaleDateString('es-EC', { dateStyle: 'long' })}${age !== null ? ` (${age} años)` : ''}`
              : null}
          />
          <InfoRow label="Tipo de sangre" value={BLOOD_LABELS[profile.bloodType] ?? '—'} />
        </div>

        {profile.allergies.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-slate-400 mb-2">Alergias</p>
            <div className="flex flex-wrap gap-2">
              {profile.allergies.map((a) => (
                <span key={a} className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Doctor info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-4">
          Mi médico
        </h2>
        <div className="flex items-center gap-3">
          {profile.doctor.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.doctor.avatarUrl} alt={profile.doctor.name}
              className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
              {profile.doctor.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{profile.doctor.name}</p>
            <p className="text-sm text-gray-400">{profile.doctor.specialty}</p>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/40 p-5">
        <button
          type="button"
          onClick={() => setShowDeleteZone((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <h2 className="font-semibold text-red-600 dark:text-red-400">Zona de peligro</h2>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Eliminar tu acceso al portal</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round"
            className={`text-gray-400 transition-transform ${showDeleteZone ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {showDeleteZone && (
          <div className="mt-4 space-y-4 pt-4 border-t border-red-100 dark:border-red-900/30">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Eliminar mi acceso al portal</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed">
                Tu cuenta de acceso será eliminada permanentemente. Tu médico conservará tu historial clínico. Esta acción no se puede deshacer.
              </p>
            </div>
            {profile.email && (
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">
                  Escribe tu correo para confirmar: <strong>{profile.email}</strong>
                </label>
                <input
                  type="email"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={profile.email}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            )}
            <button
              type="button"
              disabled={deleteConfirm !== (profile.email ?? '') || deleting || !profile.email}
              onClick={async () => {
                setDeleting(true)
                const res = await fetch('/api/patient/me', { method: 'DELETE' })
                if (res.ok) {
                  window.location.href = '/login'
                } else {
                  setDeleting(false)
                }
              }}
              className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? 'Eliminando...' : 'Eliminar mi acceso permanentemente'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value || '—'}</p>
    </div>
  )
}
