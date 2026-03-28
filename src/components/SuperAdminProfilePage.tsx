'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Users, Activity, Calendar, TrendingUp, Gift,
  Shield, Clock, ChevronRight, AlertTriangle,
  BarChart2, UserPlus, Camera, CheckCircle, AlertCircle, Pencil, X,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminProfile {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  specialty: string
  titlePrefix: string | null
}

interface PlanBreakdown {
  FREE: number
  TRIAL: number
  PRO_MENSUAL: number
  PRO_ANUAL: number
  ENTERPRISE: number
}

interface RecentDoctor {
  id: string
  name: string
  email: string
  specialty: string
  plan: string | null
  avatarUrl: string | null
  createdAt: string
  _count: { patients: number }
}

interface ExpiringTrial {
  id: string
  name: string
  email: string
  specialty: string
  trialEndsAt: string | null
  _count: { patients: number }
}

interface Stats {
  totalDoctors: number
  totalPatients: number
  totalAppointments: number
  appointmentsThisMonth: number
  newDoctorsLast30d: number
  planBreakdown: PlanBreakdown
  recentDoctors: RecentDoctor[]
  expiringTrials: ExpiringTrial[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const planBadge: Record<string, string> = {
  FREE:        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  TRIAL:       'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PRO_MENSUAL: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  PRO_ANUAL:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ENTERPRISE:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-600',
}

const planLabel: Record<string, string> = {
  FREE: 'Free', TRIAL: 'Trial', PRO_MENSUAL: 'Pro Mensual', PRO_ANUAL: 'Pro Anual', ENTERPRISE: 'Enterprise',
}

const planColors: Record<string, string> = {
  FREE:        'bg-gray-400',
  TRIAL:       'bg-amber-400',
  PRO_MENSUAL: 'bg-violet-500',
  PRO_ANUAL:   'bg-blue-500',
  ENTERPRISE:  'bg-yellow-400',
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuperAdminProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSpecialty, setEditSpecialty] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  // Avatar upload
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load profile data
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setProfile(d)
          setAvatarUrl(d.avatarUrl)
          setEditName(d.name ?? '')
          setEditSpecialty(d.specialty ?? '')
        }
        setProfileLoading(false)
      })
      .catch(() => setProfileLoading(false))

    // Load stats
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${profile.id}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setAvatarUrl(url)
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      })
    } catch (err) {
      console.error('Avatar upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveProfile() {
    if (!editName.trim()) return
    setSaving(true)
    setSaveStatus('idle')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), specialty: editSpecialty.trim(), titlePrefix: '' }),
      })
      if (res.ok) {
        setSaveStatus('ok')
        setProfile(prev => prev ? { ...prev, name: editName.trim(), specialty: editSpecialty.trim() } : prev)
        setEditOpen(false)
        // Reload to update sidebar
        setTimeout(() => window.location.reload(), 300)
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile?.name ?? 'Luis Riofrio'
  const displayInitials = getInitials(displayName)

  const statCards = [
    {
      label: 'Médicos registrados',
      value: stats?.totalDoctors,
      sub: `+${stats?.newDoctorsLast30d ?? 0} este mes`,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Pacientes en plataforma',
      value: stats?.totalPatients,
      sub: 'total acumulado',
      icon: Activity,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Citas este mes',
      value: stats?.appointmentsThisMonth,
      sub: `${stats?.totalAppointments ?? 0} citas totales`,
      icon: Calendar,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Trials por vencer',
      value: stats?.expiringTrials?.length ?? 0,
      sub: 'próximos 7 días',
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ]

  const quickLinks = [
    { href: '/admin/doctors', label: 'Gestionar médicos', icon: Users, desc: 'Cambiar planes, eliminar cuentas' },
    { href: '/admin/leads', label: 'Leads & Marketing', icon: TrendingUp, desc: 'Contactos y campañas' },
    { href: '/admin/referidos', label: 'Sistema de referidos', icon: Gift, desc: 'Seguimiento de referidos' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">

      {/* ── Header: identity card with avatar ── */}
      <div className="flex items-center gap-4 p-4 sm:p-5 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-2xl border border-primary/20 dark:border-primary/30">

        {/* Avatar with upload button */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden ring-2 ring-primary/30">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={displayName} width={72} height={72} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl">
                {profileLoading ? '…' : displayInitials}
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-60"
            title="Cambiar foto"
          >
            {uploading ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={13} />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
              {profileLoading ? <span className="inline-block w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : displayName}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-white flex-shrink-0">
              <Shield size={10} />
              Superadmin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-300 mt-0.5 truncate">
            {profileLoading ? '' : (profile?.specialty || 'Nexus Automatizaciones')} · {profile?.email ?? 'lriofrio915@gmail.com'}
          </p>
        </div>

        {/* Edit button */}
        <button
          onClick={() => { setEditOpen(true); setSaveStatus('idle') }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-primary/50 hover:text-primary transition-colors shadow-sm"
        >
          <Pencil size={13} />
          <span className="hidden sm:inline">Editar</span>
        </button>
      </div>

      {/* ── Edit modal ── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">Editar perfil</h3>
              <button onClick={() => setEditOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nombre completo</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Ej: Luis Riofrio"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Cargo / rol</label>
                <input
                  value={editSpecialty}
                  onChange={e => setEditSpecialty(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Ej: Administrador"
                />
              </div>
            </div>

            {saveStatus === 'error' && (
              <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> Error al guardar. Intenta de nuevo.</p>
            )}
            {saveStatus === 'ok' && (
              <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Guardado correctamente.</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving || !editName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <BarChart2 size={14} />
          Métricas de la plataforma
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.label} className={`${card.bg} rounded-2xl p-3 sm:p-4 space-y-1`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-300 leading-tight">{card.label}</p>
                  <Icon size={15} className={card.color} />
                </div>
                <p className={`text-2xl sm:text-3xl font-bold ${card.color}`}>
                  {loading ? <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : (card.value ?? 0)}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-400">{card.sub}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Plan breakdown ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
          <BarChart2 size={15} className="text-primary" />
          Distribución de planes
        </h2>
        {loading ? (
          <div className="space-y-2">
            {['FREE','TRIAL','PRO_MENSUAL','PRO_ANUAL','ENTERPRISE'].map(p => (
              <div key={p} className="h-7 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="space-y-3">
            {(Object.entries(stats.planBreakdown) as [string, number][])
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([plan, count]) => {
                const pct = stats.totalDoctors > 0 ? Math.round((count / stats.totalDoctors) * 100) : 0
                return (
                  <div key={plan} className="flex items-center gap-2 sm:gap-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold min-w-[80px] sm:min-w-[90px] text-center flex-shrink-0 ${planBadge[plan] ?? planBadge.FREE}`}>
                      {planLabel[plan] ?? plan}
                    </span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${planColors[plan] ?? 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 w-5 text-right flex-shrink-0">{count}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-400 w-8 text-right flex-shrink-0">{pct}%</span>
                  </div>
                )
              })}
          </div>
        ) : null}
      </div>

      {/* ── Recent + Expiring trials ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Recent registrations */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <UserPlus size={15} className="text-primary" />
              Registros recientes
            </h2>
            <Link href="/admin/doctors" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-600 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))
              : (stats?.recentDoctors ?? []).map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {doc.avatarUrl ? (
                      <Image src={doc.avatarUrl} alt={doc.name} width={32} height={32}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(doc.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-400 truncate">{doc.specialty}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${planBadge[doc.plan ?? 'FREE'] ?? planBadge.FREE}`}>
                        {planLabel[doc.plan ?? 'FREE'] ?? (doc.plan ?? 'FREE')}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Expiring trials */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Clock size={15} className="text-amber-500" />
              Trials por vencer (7 días)
            </h2>
            <Link href="/admin/doctors" className="text-xs text-primary hover:underline flex items-center gap-1">
              Gestionar <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-600 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))
              : (stats?.expiringTrials ?? []).length === 0
                ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-slate-500">
                    <Clock size={28} className="mb-2 opacity-40" />
                    <p className="text-sm">No hay trials por vencer</p>
                  </div>
                )
                : (stats?.expiringTrials ?? []).map(trial => {
                    const days = daysUntil(trial.trialEndsAt)
                    return (
                      <div key={trial.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs font-bold flex-shrink-0">
                          {getInitials(trial.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{trial.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-400 truncate">{trial.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            (days ?? 99) <= 2
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days}d`}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-slate-400">{trial._count.patients} pac.</span>
                        </div>
                      </div>
                    )
                  })
            }
          </div>
        </div>
      </div>

      {/* ── Quick access links ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Shield size={14} />
          Herramientas de administración
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {quickLinks.map(link => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={17} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{link.label}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5 truncate">{link.desc}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}
