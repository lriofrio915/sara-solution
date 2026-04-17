'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, UserPlus, CalendarDays, AlertTriangle, TrendingUp, Globe, MessageCircle, UserCheck, GitBranch, CheckCircle, X } from 'lucide-react'

interface PendingRecharge {
  id: string
  credits: number
  amountUsd: number
  payMethod: string | null
  createdAt: string
  doctor: { name: string; email: string }
}

interface StatsData {
  totalDoctors: number
  totalPatients: number
  totalAppointments: number
  appointmentsThisMonth: number
  newDoctorsLast30d: number
  planBreakdown: Record<string, number>
  leadsBySource: Record<string, number>
  totalLeads: number
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
  const [kieBalance, setKieBalance] = useState<number | null>(null)
  const [kieBalanceError, setKieBalanceError] = useState<string | null>(null)
  const [pendingRecharges, setPendingRecharges] = useState<PendingRecharge[]>([])
  const [approvingId, setApprovingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))

    fetch('/api/admin/kie-balance')
      .then(r => r.json())
      .then(d => {
        if (d?.error) setKieBalanceError(d.error)
        else if (d?.balance != null) setKieBalance(d.balance)
      })
      .catch(() => {})

    fetch('/api/admin/credits')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.pending) setPendingRecharges(d.pending) })
      .catch(() => {})
  }, [])

  async function handleRecharge(id: string, approved: boolean) {
    setApprovingId(id)
    try {
      await fetch(`/api/admin/credits/recharge/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      setPendingRecharges(prev => prev.filter(r => r.id !== id))
    } finally {
      setApprovingId(null)
    }
  }

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

      {/* ── Kie.AI balance + Solicitudes pendientes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Kie.ai balance */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl border border-violet-200 dark:border-violet-700/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-2">
              <span>🤖</span> Créditos Kie.AI disponibles
            </p>
            <Link href="/admin/credits" className="text-xs text-violet-500 hover:underline">Admin</Link>
          </div>
          {kieBalanceError ? (
            <div>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">⚠️ Sin acceso</p>
              <p className="text-xs text-amber-500 mt-1 leading-relaxed">{kieBalanceError}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Desactiva el whitelist de IP en kie.ai → API Settings</p>
            </div>
          ) : kieBalance === null ? (
            <div className="h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl animate-pulse" />
          ) : (
            <>
              <p className="text-4xl font-bold text-violet-700 dark:text-violet-300">{kieBalance.toLocaleString('es-EC')}</p>
              <p className="text-xs text-violet-500 dark:text-violet-400 mt-1">pool compartido de generación IA</p>
            </>
          )}
        </div>

        {/* Solicitudes pendientes */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <span>💳</span> Solicitudes pendientes
              {pendingRecharges.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-xs font-bold">
                  {pendingRecharges.length}
                </span>
              )}
            </p>
            <Link href="/admin/credits" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50 max-h-48 overflow-y-auto">
            {pendingRecharges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400 dark:text-slate-500">
                <CheckCircle size={22} className="mb-1 opacity-40" />
                <p className="text-xs">Sin solicitudes pendientes</p>
              </div>
            ) : pendingRecharges.map(r => {
              const methodLabel = r.payMethod === 'TRANSFER' ? 'Banco' : r.payMethod === 'CRYPTO' ? 'Cripto' : r.payMethod === 'CARD' ? 'Tarjeta' : '—'
              return (
                <div key={r.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{r.doctor.name}</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-400">{r.credits} cr · ${Number(r.amountUsd).toFixed(0)} · {methodLabel}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleRecharge(r.id, true)}
                      disabled={approvingId === r.id}
                      className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 flex items-center justify-center transition-colors disabled:opacity-50"
                      title="Aprobar"
                    >
                      {approvingId === r.id
                        ? <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        : <CheckCircle size={14} />}
                    </button>
                    <button
                      onClick={() => handleRecharge(r.id, false)}
                      disabled={approvingId === r.id}
                      className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/60 flex items-center justify-center transition-colors disabled:opacity-50"
                      title="Rechazar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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

      {/* ── Fuentes de captación de leads ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Fuentes de captación de leads</h2>
          <Link href="/admin/leads" className="text-xs text-primary hover:underline">Ver todos</Link>
        </div>

        {/* Canales activos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <a
            href="https://consultorio.site"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <Globe size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 dark:text-white">Landing Page</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">https://consultorio.site</p>
            </div>
          </a>

          <a
            href="https://wa.me/593996691586"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 dark:text-white">WhatsApp</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">https://wa.me/593996691586</p>
            </div>
          </a>
        </div>

        {/* Distribución por origen */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-3">Distribución por origen</p>
          {stats.totalLeads === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 py-1">No hay leads registrados aún</p>
          ) : (
            <div className="space-y-2">
              {(
                [
                  { key: 'FORMULARIO', label: 'Formulario web', color: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-400' },
                  { key: 'WHATSAPP',   label: 'WhatsApp',       color: 'bg-green-500',   text: 'text-green-600 dark:text-green-400' },
                  { key: 'CHAT',       label: 'Chat',           color: 'bg-violet-500',  text: 'text-violet-600 dark:text-violet-400' },
                  { key: 'REFERIDO',   label: 'Referido',       color: 'bg-amber-400',   text: 'text-amber-600 dark:text-amber-400' },
                  { key: 'OTRO',       label: 'Otro',           color: 'bg-gray-400',    text: 'text-gray-500 dark:text-slate-400' },
                ] as const
              )
                .filter(({ key }) => (stats.leadsBySource[key] ?? 0) > 0)
                .map(({ key, label, color, text }) => {
                  const count = stats.leadsBySource[key] ?? 0
                  const pct = Math.round((count / stats.totalLeads) * 100)
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={`font-medium ${text}`}>{label}</span>
                        <span className="text-gray-500 dark:text-slate-400">{count} · {pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* ── Herramientas de administración ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Herramientas de administración</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              href: '/admin/doctors',
              icon: UserCheck,
              label: 'Gestionar médicos',
              desc: 'Cambiar planes, eliminar cuentas',
              color: 'text-blue-600 dark:text-blue-400',
              bg: 'bg-blue-50 dark:bg-blue-900/20',
            },
            {
              href: '/admin/leads',
              icon: Users,
              label: 'Leads',
              desc: 'Contactos y fuentes de captación',
              color: 'text-green-600 dark:text-green-400',
              bg: 'bg-green-50 dark:bg-green-900/20',
            },
            {
              href: '/admin/referidos',
              icon: GitBranch,
              label: 'Sistema de referidos',
              desc: 'Seguimiento de referidos',
              color: 'text-violet-600 dark:text-violet-400',
              bg: 'bg-violet-50 dark:bg-violet-900/20',
            },
          ].map(({ href, icon: Icon, label, desc, color, bg }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
            >
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-white">{label}</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
