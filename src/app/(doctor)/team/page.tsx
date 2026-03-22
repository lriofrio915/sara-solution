'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus, Trash2, ToggleLeft, ToggleRight, Mail, Shield } from 'lucide-react'

interface Member {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'ASSISTANT'
  active: boolean
  createdAt: string
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  // Invite form
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function loadMembers() {
    setLoading(true)
    const res = await fetch('/api/team/members')
    if (res.status === 403) { setForbidden(true); setLoading(false); return }
    const data = await res.json()
    setMembers(data.members ?? [])
    setLoading(false)
  }

  useEffect(() => { loadMembers() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al invitar')
      setSuccessMsg(`Invitación enviada a ${email}`)
      setName('')
      setEmail('')
      setShowForm(false)
      await loadMembers()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(member: Member) {
    await fetch(`/api/team/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !member.active }),
    })
    await loadMembers()
  }

  async function handleDelete(member: Member) {
    if (!confirm(`¿Eliminar a ${member.name}? Esta acción no se puede deshacer.`)) return
    await fetch(`/api/team/members/${member.id}`, { method: 'DELETE' })
    await loadMembers()
  }

  if (forbidden) return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 text-center">
        <Shield className="mx-auto mb-3 text-amber-500" size={32} />
        <p className="font-semibold text-amber-800 dark:text-amber-300">Solo el médico titular puede gestionar el equipo.</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={24} className="text-primary" />
            Equipo
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            Gestiona los usuarios que tienen acceso a tu consultorio.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setFormError(null); setSuccessMsg(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <UserPlus size={16} />
          Invitar
        </button>
      </div>

      {/* Success */}
      {successMsg && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <Mail size={16} />
          {successMsg}
        </div>
      )}

      {/* Invite Form */}
      {showForm && (
        <form onSubmit={handleInvite} className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Invitar asistente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nombre completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ana López"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ana@clinica.com"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60 hover:bg-primary/90 transition-colors"
            >
              {submitting ? 'Enviando...' : 'Enviar invitación'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">
            <Users size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aún no tienes miembros del equipo.</p>
            <p className="text-xs mt-1">Invita a tu asistente para que pueda gestionar citas y pacientes.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {members.map(member => (
              <li key={member.id} className="flex items-center gap-4 px-5 py-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {member.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{member.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      member.role === 'OWNER'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                    }`}>
                      {member.role === 'OWNER' ? 'Médico' : 'Asistente'}
                    </span>
                    {!member.active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{member.email}</p>
                </div>

                {/* Actions (only for ASSISTANT) */}
                {member.role === 'ASSISTANT' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(member)}
                      title={member.active ? 'Desactivar acceso' : 'Activar acceso'}
                      className={`p-2 rounded-lg transition-colors ${
                        member.active
                          ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {member.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button
                      onClick={() => handleDelete(member)}
                      title="Eliminar miembro"
                      className="p-2 rounded-lg text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500 mt-4 text-center">
        Los asistentes pueden gestionar citas, pacientes y herramientas de marketing. No pueden ver datos de facturación ni configurar el perfil del médico.
      </p>
    </div>
  )
}
