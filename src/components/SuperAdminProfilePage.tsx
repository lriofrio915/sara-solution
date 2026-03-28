'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Users, Activity, Calendar, TrendingUp, Gift,
  Shield, Clock, ChevronRight, ExternalLink, AlertTriangle,
  BarChart2, UserPlus,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'

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

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function SuperAdminProfilePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const planColors: Record<string, string> = {
    FREE:        'bg-gray-400',
    TRIAL:       'bg-amber-400',
    PRO_MENSUAL: 'bg-violet-500',
    PRO_ANUAL:   'bg-blue-500',
    ENTERPRISE:  'bg-yellow-400',
  }

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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

      {/* Header admin */}
      <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-2xl border border-primary/20 dark:border-primary/30">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-md">
          LR
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Luis Riofrio</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-white">
              <Shield size={11} />
              Superadmin
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-300 mt-0.5">Nexus Automatizaciones · lriofrio915@gmail.com</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
          <Clock size={13} />
          <span>Sara Medical Platform</span>
        </div>
      </div>

      {/* Stat cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <BarChart2 size={15} />
          Métricas de la plataforma
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.label} className={`${card.bg} rounded-2xl p-4 space-y-1`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-300 leading-tight">{card.label}</p>
                  <Icon size={16} className={card.color} />
                </div>
                <p className={`text-3xl font-bold ${card.color}`}>
                  {loading ? <span className="inline-block w-8 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : (card.value ?? 0)}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-400">{card.sub}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plan breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
          <BarChart2 size={15} className="text-primary" />
          Distribución de planes
        </h2>
        {loading ? (
          <div className="space-y-2">
            {['FREE','TRIAL','PRO_MENSUAL','PRO_ANUAL','ENTERPRISE'].map(p => (
              <div key={p} className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
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
                  <div key={plan} className="flex items-center gap-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold min-w-[80px] text-center ${planBadge[plan] ?? planBadge.FREE}`}>
                      {planLabel[plan] ?? plan}
                    </span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${planColors[plan] ?? 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 w-6 text-right">{count}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-400 w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
          </div>
        ) : null}
      </div>

      {/* Two-column: Recent + Expiring trials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent registrations */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
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
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-600 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))
              : (stats?.recentDoctors ?? []).map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
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
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
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
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
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
                      <div key={trial.id} className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
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

      {/* Quick access links */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Shield size={15} />
          Herramientas de administración
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickLinks.map(link => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{link.label}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">{link.desc}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}
