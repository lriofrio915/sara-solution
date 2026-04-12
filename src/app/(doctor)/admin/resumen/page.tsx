'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, UserPlus, CalendarDays, AlertTriangle, TrendingUp } from 'lucide-react'

interface StatsData {
  totalDoctors: number
  totalPatients: number
  totalAppointments: number
  appointmentsThisMonth: number
  newDoctorsLast30d: number
  planBreakdown: Record<string, number>
  recentDoctors: {
    id: string
    name: string
    email: string
    specialty: string
    plan: string
    avatarUrl: string | null
    createdAt: string
    _count: { patients: number }
  }[]
  expiringTrials: {
    id: string
    name: string
    email: string
    specialty: string
    trialEndsAt: string
    _count: { patients: number }
  }[]
}

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free', TRIAL: 'Trial',
  PRO_MENSUAL: 'Pro Mensual', PRO_ANUAL: 'Pro Anual', ENTERPRISE: 'Enterprise',
}
const PLAN_COLORS: Record<string, string> = {
  FREE:        'bg-gray-200 dark:bg-gray-600',
  TRIAL:       'bg-amber-400',
  PRO_MENSUAL: 'bg-violet-500',
  PRO_ANUAL:   'bg-blue-500',
  ENTERPRISE:  'bg-yellow-500',
}
const PLAN_TEXT: Record<string, string> = {
  FREE: 'text-gray-600 dark:text-gray-300',
  TRIAL: 'text-amber-700 dark:text-amber-300',
  PRO_MENSUAL: 'text-violet-700 dark:text-violet-300',
  PRO_ANUAL: 'text-blue-700 dark:text-blue-300',
  ENTERPRISE: 'text-yellow-700 dark:text-yellow-400',
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function daysUntil(date: string) {
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
}

export default function AdminResumenPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return <p className="text-center text-gray-400 py-16">Error al cargar estadísticas.</p>
  }

  const total = stats.totalDoctors || 1
  const planOrder = ['TRIAL', 'PRO_ANUAL', 'PRO_MENSUAL', 'ENTERPRISE', 'FREE']

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Métricas principales ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Médicos registrados',
            value: stats.totalDoctors,
            sub: `+${stats.newDoctorsLast30d} este mes`,
            icon: Users,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
          },
          {
            label: 'Pacientes en plataforma',
            value: stats.totalPatients,
            sub: 'total acumulado',
            icon: UserPlus,
            color: 'text-teal-600 dark:text-teal-400',
            bg: 'bg-teal-50 dark:bg-teal-900/20',
          },
          {
            label: 'Citas este mes',
            value: stats.appointmentsThisMonth,
            sub: `${stats.totalAppointments} citas totales`,
            icon: CalendarDays,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-900/20',
          },
          {
            label: 'Trials por vencer',
            value: stats.expiringTrials.length,
            sub: 'próximos 7 días',
            icon: AlertTriangle,
            color: stats.expiringTrials.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500',
            bg: stats.expiringTrials.length > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800',
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl p-4 ${bg} border border-white/60 dark:border-gray-700/60`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-white dark:bg-gray-800 shadow-sm`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs font-medium text-gray-600 dark:text-slate-300 mt-0.5">{label}</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Fila media: distribución + registros recientes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Distribución de planes */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Distribución de planes</h2>
            <TrendingUp size={15} className="text-gray-400" />
          </div>
          <div className="space-y-2.5">
            {planOrder.map(plan => {
              const count = stats.planBreakdown[plan] ?? 0
              const pct = Math.round((count / total) * 100)
              if (count === 0) return null
              return (
                <div key={plan}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-medium ${PLAN_TEXT[plan]}`}>{PLAN_LABELS[plan]}</span>
                    <span className="text-gray-500 dark:text-slate-400">{count} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${PLAN_COLORS[plan]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Registros recientes */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Registros recientes</h2>
            <Link href="/admin/doctors" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-2">
            {stats.recentDoctors.slice(0, 6).map(doc => (
              <div key={doc.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/40 to-blue-400/40 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                  {getInitials(doc.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-white truncate">{doc.name}</p>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{doc.specialty}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PLAN_TEXT[doc.plan ?? 'FREE']} bg-gray-100 dark:bg-gray-700`}>
                    {PLAN_LABELS[doc.plan ?? 'FREE']}
                  </span>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{fmtDate(doc.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trials por vencer ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Trials por vencer (7 días)</h2>
          <Link href="/admin/doctors?plan=TRIAL" className="text-xs text-primary hover:underline">Gestionar</Link>
        </div>
        {stats.expiringTrials.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 py-2">No hay trials por vencer</p>
        ) : (
          <div className="space-y-2">
            {stats.expiringTrials.map(doc => {
              const days = daysUntil(doc.trialEndsAt)
              return (
                <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                  <div className="w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-700/40 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-300 flex-shrink-0">
                    {getInitials(doc.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-white truncate">{doc.name}</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{doc.email}</p>
                  </div>
                  <span className={`text-[11px] font-bold flex-shrink-0 ${days <= 2 ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                    {days === 0 ? 'Hoy' : days === 1 ? '1 día' : `${days} días`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
