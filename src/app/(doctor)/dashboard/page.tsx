import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Users, CalendarDays, CalendarCheck2, ClipboardList,
  FileText, FlaskConical, Pill, Bell, TrendingUp,
  TrendingDown, Minus, UserPlus, CheckCircle2, XCircle,
  Clock, AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { formatTime } from '@/lib/utils'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import AnalyticsInsights from '@/components/AnalyticsInsights'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Resumen IA' }

// ─── helpers ────────────────────────────────────────────────────────────────

const APT_TYPE_LABELS: Record<string, string> = {
  IN_PERSON:  'Presencial',
  TELECONSULT:'Teleconsulta',
  HOME_VISIT: 'Domicilio',
  EMERGENCY:  'Urgencia',
  FOLLOW_UP:  'Seguimiento',
}

const APT_TYPE_COLORS: Record<string, string> = {
  IN_PERSON:  '#2563EB',
  TELECONSULT:'#0D9488',
  HOME_VISIT: '#8B5CF6',
  EMERGENCY:  '#EF4444',
  FOLLOW_UP:  '#F59E0B',
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED:  '#10B981',
  SCHEDULED:  '#2563EB',
  CONFIRMED:  '#0D9488',
  CANCELLED:  '#EF4444',
  NO_SHOW:    '#F59E0B',
}

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completadas',
  SCHEDULED: 'Programadas',
  CONFIRMED: 'Confirmadas',
  CANCELLED: 'Canceladas',
  NO_SHOW:   'No asistió',
}

function getLast6Months(): { label: string; year: number; month: number }[] {
  const result = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: d.toLocaleDateString('es-EC', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return result
}

function pct(num: number, den: number) {
  if (!den) return 0
  return Math.round((num / den) * 100)
}

function trend(curr: number, prev: number): { icon: React.ReactNode; text: string; color: string } {
  if (prev === 0 && curr === 0) return { icon: <Minus size={12} />, text: 'sin cambios', color: 'text-gray-400' }
  if (prev === 0) return { icon: <TrendingUp size={12} />, text: `+${curr} nuevo`, color: 'text-green-500' }
  const diff = curr - prev
  const diffPct = Math.abs(Math.round((diff / prev) * 100))
  if (diff > 0) return { icon: <TrendingUp size={12} />, text: `+${diffPct}% vs mes ant.`, color: 'text-green-500' }
  if (diff < 0) return { icon: <TrendingDown size={12} />, text: `-${diffPct}% vs mes ant.`, color: 'text-red-400' }
  return { icon: <Minus size={12} />, text: 'igual que mes ant.', color: 'text-gray-400' }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect('/login')

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ authId: user.id }, { email: user.email! }] },
    })
    if (!doctor) redirect('/onboarding')

    // ── Date ranges (Ecuador UTC-5) ──────────────────────────────────────────
    const nowUtc = new Date()
    const ecuadorNow = new Date(nowUtc.getTime() - 5 * 60 * 60 * 1000)

    const todayStart = new Date(Date.UTC(
      ecuadorNow.getUTCFullYear(), ecuadorNow.getUTCMonth(), ecuadorNow.getUTCDate(), 5, 0, 0,
    ))
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    const monthStart = new Date(Date.UTC(ecuadorNow.getUTCFullYear(), ecuadorNow.getUTCMonth(), 1, 5, 0, 0))
    const monthEnd   = new Date(Date.UTC(ecuadorNow.getUTCFullYear(), ecuadorNow.getUTCMonth() + 1, 0, 28, 59, 59, 999))

    const prevMonthStart = new Date(Date.UTC(ecuadorNow.getUTCFullYear(), ecuadorNow.getUTCMonth() - 1, 1, 5, 0, 0))
    const prevMonthEnd   = new Date(Date.UTC(ecuadorNow.getUTCFullYear(), ecuadorNow.getUTCMonth(), 0, 28, 59, 59, 999))

    const sixMonthsAgo = new Date(Date.UTC(ecuadorNow.getUTCFullYear(), ecuadorNow.getUTCMonth() - 5, 1, 5, 0, 0))

    // ── Parallel queries ─────────────────────────────────────────────────────
    const [
      totalPatients,
      newPatientsThisMonth,
      newPatientsPrevMonth,
      todayAppointments,
      monthAppointments,
      prevMonthAppointments,
      pendingReminders,
      prescriptionsThisMonth,
      examOrdersThisMonth,
      certificatesThisMonth,
      recentAppointments,
      recentPatients,
      allTimeAppointments,
      upcomingReminders,
    ] = await Promise.all([
      prisma.patient.count({ where: { doctorId: doctor.id } }),

      prisma.patient.count({ where: { doctorId: doctor.id, createdAt: { gte: monthStart, lte: monthEnd } } }),
      prisma.patient.count({ where: { doctorId: doctor.id, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } } }),

      prisma.appointment.findMany({
        where: { doctorId: doctor.id, date: { gte: todayStart, lte: todayEnd }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
        include: { patient: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),

      prisma.appointment.findMany({
        where: { doctorId: doctor.id, date: { gte: monthStart, lte: monthEnd } },
        select: { status: true, type: true },
      }),

      prisma.appointment.findMany({
        where: { doctorId: doctor.id, date: { gte: prevMonthStart, lte: prevMonthEnd } },
        select: { status: true },
      }),

      prisma.reminder.count({ where: { doctorId: doctor.id, completed: false } }),

      prisma.prescription.count({ where: { doctorId: doctor.id, date: { gte: monthStart, lte: monthEnd } } }),
      prisma.examOrder.count({ where: { doctorId: doctor.id, date: { gte: monthStart, lte: monthEnd } } }),
      prisma.medicalCertificate.count({ where: { doctorId: doctor.id, date: { gte: monthStart, lte: monthEnd } } }),

      // last 6 months for charts
      prisma.appointment.findMany({
        where: { doctorId: doctor.id, date: { gte: sixMonthsAgo } },
        select: { date: true, status: true, type: true },
      }),
      prisma.patient.findMany({
        where: { doctorId: doctor.id, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),

      // all-time for type/status distribution
      prisma.appointment.findMany({
        where: { doctorId: doctor.id },
        select: { status: true, type: true },
      }),

      prisma.reminder.findMany({
        where: { doctorId: doctor.id, completed: false, dueDate: { gte: nowUtc } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ])

    // ── Computed metrics ─────────────────────────────────────────────────────
    const monthTotal      = monthAppointments.length
    const monthCompleted  = monthAppointments.filter(a => a.status === 'COMPLETED').length
    const monthCancelled  = monthAppointments.filter(a => a.status === 'CANCELLED').length
    const monthNoShow     = monthAppointments.filter(a => a.status === 'NO_SHOW').length
    const prevMonthTotal  = prevMonthAppointments.length

    const completionRate  = pct(monthCompleted, monthTotal)
    const noShowRate      = pct(monthNoShow, monthTotal)
    const cancellationRate = pct(monthCancelled, monthTotal)

    const totalDocuments  = prescriptionsThisMonth + examOrdersThisMonth + certificatesThisMonth

    // ── Monthly chart data ───────────────────────────────────────────────────
    const months = getLast6Months()

    const monthlyAppointments = months.map(m => ({
      label: m.label,
      value: recentAppointments.filter(a => {
        const d = new Date(a.date)
        return d.getUTCFullYear() === m.year && d.getUTCMonth() === m.month
      }).length,
    }))

    const monthlyNewPatients = months.map(m => ({
      label: m.label,
      value: recentPatients.filter(p => {
        const d = new Date(p.createdAt)
        return d.getUTCFullYear() === m.year && d.getUTCMonth() === m.month
      }).length,
    }))

    // ── Type distribution ────────────────────────────────────────────────────
    const typeCounts: Record<string, number> = {}
    allTimeAppointments.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1 })
    const typeDistribution = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, value]) => ({
        label: APT_TYPE_LABELS[type] ?? type,
        value,
        color: APT_TYPE_COLORS[type] ?? '#9ca3af',
      }))

    // ── Status distribution (all-time) ────────────────────────────────────────
    const statusCounts: Record<string, number> = {}
    allTimeAppointments.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1 })
    const statusDistribution = Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([status, value]) => ({
        label: STATUS_LABELS[status] ?? status,
        value,
        color: STATUS_COLORS[status] ?? '#9ca3af',
      }))

    // ── Greeting ─────────────────────────────────────────────────────────────
    const hour = ecuadorNow.getUTCHours()
    const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
    const firstName = doctor.name.split(' ')[0]
    const dateStr = nowUtc.toLocaleDateString('es-EC', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Guayaquil',
    })

    const apptTrend    = trend(monthTotal, prevMonthTotal)
    const patientTrend = trend(newPatientsThisMonth, newPatientsPrevMonth)

    // ── Onboarding checklist ─────────────────────────────────────────────────
    let igConnected = false
    try {
      if (doctor.socialTokens) {
        const t = JSON.parse(doctor.socialTokens) as Record<string, { accessToken?: string }>
        igConnected = !!t?.instagram?.accessToken
      }
    } catch { /* ignore malformed JSON */ }

    const onboardingSteps = [
      { done: !!doctor.bio, label: 'Completa tu perfil', href: '/onboarding' },
      { done: totalPatients > 0, label: 'Agrega tu primer paciente', href: '/patients/new' },
      { done: igConnected, label: 'Conecta Instagram', href: '/profile' },
    ]
    const onboardingDoneCount = onboardingSteps.filter(s => s.done).length
    const showChecklist = onboardingDoneCount < 3

    // ─────────────────────────────────────────────────────────────────────────
    return (
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Onboarding checklist — visible until all 3 steps complete */}
        {showChecklist && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Primeros pasos · {onboardingDoneCount}/3 completados
              </p>
              <div className="flex gap-1">
                {onboardingSteps.map((s, i) => (
                  <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${s.done ? 'bg-blue-500' : 'bg-blue-200 dark:bg-blue-700'}`} />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {onboardingSteps.map((step, i) => (
                <a key={i} href={step.href}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium transition-colors ${
                    step.done
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-400 dark:text-blue-500 line-through pointer-events-none'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                  {step.done
                    ? <CheckCircle2 size={12} />
                    : <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[10px] font-bold">{i + 1}</span>
                  }
                  {step.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-300 mt-0.5 capitalize">{dateStr}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/patients/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
              <UserPlus size={16} /> Nuevo Paciente
            </Link>
            <Link href="/appointments/new"
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <CalendarDays size={16} /> Nueva Cita
            </Link>
          </div>
        </div>

        {/* ── Agenda del día (primera sección — acción principal del médico) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Agenda del día */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 dark:text-white">
                Agenda de hoy
                <span className="ml-2 text-sm font-normal text-gray-400">({todayAppointments.length} citas)</span>
              </h2>
              <Link href="/appointments" className="text-xs text-primary font-semibold hover:underline">
                Ver todas →
              </Link>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                <CalendarDays size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-slate-400">No hay citas programadas hoy</p>
                <Link href="/appointments/new"
                  className="mt-3 text-primary text-sm font-semibold hover:underline">
                  Agendar una cita →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAppointments.map((apt) => (
                  <div key={apt.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                    <div className="text-center w-14 flex-shrink-0">
                      <p className="font-bold text-primary text-sm">{formatTime(apt.date)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {apt.patient.name}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {APT_TYPE_LABELS[apt.type] ?? apt.type}
                        {apt.reason ? ` · ${apt.reason}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                      apt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      apt.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {apt.status === 'CONFIRMED' ? 'Confirmada' :
                       apt.status === 'COMPLETED' ? 'Completada' : 'Programada'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel de actividad del mes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Actividad del mes</h2>

            {/* Document stats */}
            <div className="space-y-3 mb-5">
              {[
                { icon: Pill, label: 'Recetas emitidas', value: prescriptionsThisMonth, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', href: '/prescriptions' },
                { icon: FlaskConical, label: 'Órdenes de examen', value: examOrdersThisMonth, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', href: '/exam-orders' },
                { icon: FileText, label: 'Certificados', value: certificatesThisMonth, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', href: '/certificates' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className={`flex items-center gap-3 p-3 rounded-xl ${item.bg} hover:opacity-80 transition-opacity`}>
                  <item.icon size={18} className={item.color} />
                  <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                  <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
                </Link>
              ))}
            </div>

            {/* Rate summary */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Indicadores del mes</p>
              {[
                { label: 'Completadas', value: `${completionRate}%`, icon: CheckCircle2, color: 'text-green-500' },
                { label: 'Canceladas', value: `${cancellationRate}%`, icon: XCircle, color: 'text-red-400' },
                { label: 'No asistió', value: `${noShowRate}%`, icon: AlertCircle, color: 'text-yellow-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <item.icon size={14} className={item.color} />
                  <span className="text-xs text-gray-600 dark:text-slate-300 flex-1">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">

          {/* Pacientes totales */}
          <Link href="/patients"
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Users size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${patientTrend.color}`}>
                {patientTrend.icon}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPatients}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Pacientes totales</p>
            <p className={`text-xs mt-1 font-medium ${patientTrend.color}`}>{patientTrend.text}</p>
          </Link>

          {/* Nuevos este mes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="w-9 h-9 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center mb-3">
              <UserPlus size={18} className="text-teal-600 dark:text-teal-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{newPatientsThisMonth}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Nuevos este mes</p>
            <p className="text-xs text-gray-400 mt-1">{newPatientsPrevMonth} el mes pasado</p>
          </div>

          {/* Citas hoy */}
          <Link href="/appointments"
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center mb-3">
              <CalendarDays size={18} className="text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayAppointments.length}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Citas hoy</p>
            <p className="text-xs text-gray-400 mt-1">Programadas</p>
          </Link>

          {/* Citas este mes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <CalendarCheck2 size={18} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${apptTrend.color}`}>
                {apptTrend.icon}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{monthTotal}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Citas este mes</p>
            <p className={`text-xs mt-1 font-medium ${apptTrend.color}`}>{apptTrend.text}</p>
          </div>

          {/* Tasa asistencia */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-3">
              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{completionRate}%</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Tasa asistencia</p>
            <p className="text-xs text-red-400 mt-1">{noShowRate}% no asistió</p>
          </div>

          {/* Documentos */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-3">
              <ClipboardList size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalDocuments}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Documentos / mes</p>
            <p className="text-xs text-gray-400 mt-1">Rec · Ord · Cert</p>
          </div>
        </div>

        {/* ── Charts row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Citas por mes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 lg:col-span-1">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Citas por mes</h2>
              <span className="text-xs text-gray-400">últimos 6 meses</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Evolución de consultas agendadas</p>
            <BarChart data={monthlyAppointments} color="#2563EB" />
          </div>

          {/* Nuevos pacientes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 lg:col-span-1">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Crecimiento de pacientes</h2>
              <span className="text-xs text-gray-400">últimos 6 meses</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Nuevos pacientes registrados por mes</p>
            <LineChart data={monthlyNewPatients} color="#0D9488" />
          </div>

          {/* Tipos de cita */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Tipos de consulta</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Distribución histórica por modalidad</p>
            {typeDistribution.length > 0
              ? <DonutChart data={typeDistribution} size={100} />
              : <p className="text-xs text-gray-400 text-center py-8">Sin citas registradas aún</p>
            }
          </div>
        </div>

        {/* ── Analytics row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Estado de citas (donut) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Estado de citas</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Distribución histórica de resultados</p>
            {statusDistribution.length > 0
              ? <DonutChart data={statusDistribution} size={100} />
              : <p className="text-xs text-gray-400 text-center py-8">Sin citas registradas aún</p>
            }
          </div>

          {/* Barra de indicadores este mes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Resumen mensual</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">Desglose de citas de este mes</p>
            <div className="space-y-4">
              {[
                { label: 'Completadas', value: monthCompleted, total: monthTotal, color: 'bg-green-500' },
                { label: 'Canceladas', value: monthCancelled, total: monthTotal, color: 'bg-red-400' },
                { label: 'No asistió', value: monthNoShow, total: monthTotal, color: 'bg-yellow-400' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-600 dark:text-slate-300">{item.label}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{item.value} / {item.total}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${pct(item.value, item.total)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recordatorios pendientes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                Recordatorios
                {pendingReminders > 0 && (
                  <span className="ml-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingReminders}
                  </span>
                )}
              </h2>
              <Link href="/reminders" className="text-xs text-primary font-semibold hover:underline">Ver todos →</Link>
            </div>
            {upcomingReminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Bell size={28} className="text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-xs text-gray-400">Sin recordatorios pendientes</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingReminders.map(r => {
                  const due = new Date(r.dueDate)
                  const isOverdue = due < nowUtc
                  const dueFmt = due.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', timeZone: 'America/Guayaquil' })
                  return (
                    <div key={r.id} className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        r.priority === 'HIGH' ? 'bg-red-400' :
                        r.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{r.title}</p>
                        <p className={`text-xs flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                          <Clock size={10} />
                          {isOverdue ? 'Vencido · ' : ''}{dueFmt}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Sara IA Insights (diagnósticos, medicamentos, Q&A) ───────────── */}
        <AnalyticsInsights />

      </div>
    )
  } catch (error) {
    console.error('Dashboard error:', error)
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-red-600 mb-2">Error cargando el dashboard</h1>
        <pre className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl overflow-auto">{String(error)}</pre>
      </div>
    )
  }
}
