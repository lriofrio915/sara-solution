'use client'

import { useEffect, useState } from 'react'
import {
  Users, Calendar, CheckCircle2, Pill, FlaskConical, FileText,
  TrendingUp, TrendingDown, Minus, HelpCircle, Brain,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Overview {
  totalPatients: number
  patientsThisMonth: number
  patientsLastMonth: number
  totalAppointments: number
  apptThisMonth: number
  apptLastMonth: number
  totalPrescriptions: number
  prescThisMonth: number
  totalExamOrders: number
  totalCertificates: number
  completionRate: number
  cancellationRate: number
  noShowRate: number
}

interface DiagItem { name: string; count: number }
interface TrendItem { label: string; value: number }

interface AnalyticsData {
  overview: Overview
  topDiagnoses: DiagItem[]
  topMedications: DiagItem[]
  trendData: TrendItem[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function trendBadge(curr: number, prev: number) {
  if (prev === 0 && curr === 0) return { icon: <Minus size={11} />, text: 'sin cambios', color: 'text-gray-400' }
  if (prev === 0) return { icon: <TrendingUp size={11} />, text: `+${curr} nuevo`, color: 'text-green-500' }
  const diff = curr - prev
  const pct = Math.abs(Math.round((diff / prev) * 100))
  if (diff > 0) return { icon: <TrendingUp size={11} />, text: `+${pct}% vs mes ant.`, color: 'text-green-500' }
  if (diff < 0) return { icon: <TrendingDown size={11} />, text: `-${pct}% vs mes ant.`, color: 'text-red-400' }
  return { icon: <Minus size={11} />, text: 'igual que mes ant.', color: 'text-gray-400' }
}

// ─── Bar chart (div-based) ────────────────────────────────────────────────────

function HBarChart({ items, color }: { items: DiagItem[]; color: string }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-slate-400 text-center py-8">
        No hay datos suficientes aún
      </p>
    )
  }
  const max = Math.max(...items.map(i => i.count), 1)
  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => (
        <div key={idx}>
          <div className="flex justify-between items-center mb-1 gap-2">
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1" title={item.name}>
              {item.name}
            </span>
            <span className="text-xs font-bold text-gray-500 dark:text-slate-300 flex-shrink-0">
              {item.count}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${(item.count / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Trend bar chart ──────────────────────────────────────────────────────────

function TrendChart({ data }: { data: TrendItem[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-slate-400 text-center py-8">
        No hay datos suficientes aún
      </p>
    )
  }
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-primary">{item.value}</span>
          <div
            className="w-full bg-primary/80 rounded-t-lg transition-all duration-500"
            style={{ height: `${Math.max((item.value / max) * 96, 4)}px` }}
          />
          <span className="text-[10px] text-gray-400 dark:text-slate-400 text-center leading-tight">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="w-10 h-10" />
          <div className="space-y-2">
            <Skeleton className="w-64 h-6" />
            <Skeleton className="w-48 h-4" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-semibold mb-2">Error cargando análisis</p>
        <p className="text-sm text-gray-400">{error ?? 'Error desconocido'}</p>
      </div>
    )
  }

  const { overview, topDiagnoses, topMedications, trendData } = data
  const patientTrend = trendBadge(overview.patientsThisMonth, overview.patientsLastMonth)
  const apptTrend = trendBadge(overview.apptThisMonth, overview.apptLastMonth)

  // KPI cards config
  const kpiCards = [
    {
      label: 'Total Pacientes',
      value: overview.totalPatients,
      sub: patientTrend.text,
      subColor: patientTrend.color,
      icon: Users,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      trend: patientTrend.icon,
    },
    {
      label: 'Citas este mes',
      value: overview.apptThisMonth,
      sub: apptTrend.text,
      subColor: apptTrend.color,
      icon: Calendar,
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconColor: 'text-violet-600 dark:text-violet-400',
      trend: apptTrend.icon,
    },
    {
      label: 'Tasa Completación',
      value: `${overview.completionRate}%`,
      sub: 'de citas totales',
      subColor: 'text-gray-400',
      icon: CheckCircle2,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      trend: null,
    },
    {
      label: 'Recetas este mes',
      value: overview.prescThisMonth,
      sub: `${overview.totalPrescriptions} en total`,
      subColor: 'text-gray-400',
      icon: Pill,
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
      iconColor: 'text-teal-600 dark:text-teal-400',
      trend: null,
    },
    {
      label: 'Órdenes de examen',
      value: overview.totalExamOrders,
      sub: 'total histórico',
      subColor: 'text-gray-400',
      icon: FlaskConical,
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      trend: null,
    },
    {
      label: 'Certificados',
      value: overview.totalCertificates,
      sub: 'total histórico',
      subColor: 'text-gray-400',
      icon: FileText,
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      trend: null,
    },
  ]

  // Sara IA Q&A cards
  const qaCards = [
    {
      question: '¿Cuál es mi diagnóstico más frecuente?',
      answer: topDiagnoses[0]?.name ?? 'Sin datos aún',
    },
    {
      question: '¿Qué medicamento prescribo más?',
      answer: topMedications[0]?.name ?? 'Sin datos aún',
    },
    {
      question: '¿Cuántos pacientes nuevos tuve este mes?',
      answer: `${overview.patientsThisMonth} pacientes`,
    },
    {
      question: '¿Cuál es mi tasa de ausentismo?',
      answer: `${overview.noShowRate}% de citas`,
    },
    {
      question: '¿Cuántas consultas completé este mes?',
      answer: `${overview.apptThisMonth} consultas`,
    },
    {
      question: '¿Cuántas recetas emití este mes?',
      answer: `${overview.prescThisMonth} recetas`,
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Brain size={24} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Análisis e Inteligencia Médica
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-300 mt-0.5">
            Sara IA analiza tu práctica médica en tiempo real
          </p>
        </div>
      </div>

      {/* ── Section 1: KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                <card.icon size={18} className={card.iconColor} />
              </div>
              {card.trend && (
                <span className={`flex items-center gap-1 text-xs font-medium ${card.subColor}`}>
                  {card.trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-xs text-gray-500 dark:text-slate-300 mt-0.5">{card.label}</p>
            <p className={`text-xs mt-1 font-medium ${card.subColor}`}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Section 2: Sara IA Q&A ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Brain size={18} className="text-primary" />
          <h2 className="font-bold text-gray-900 dark:text-white">Sara IA responde</h2>
          <span className="text-xs bg-primary/10 text-primary dark:bg-primary/20 px-2 py-0.5 rounded-full font-semibold">
            Powered by IA
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {qaCards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex gap-3"
            >
              <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <HelpCircle size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 dark:text-slate-400 leading-snug">{card.question}</p>
                <p className="text-sm font-bold text-primary mt-1 leading-snug break-words">{card.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sections 3 & 4: Top diagnoses and medications ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top 10 Diagnósticos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                Top 10 Diagnósticos del Año
              </h2>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                Por frecuencia en atenciones médicas
              </p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
              {topDiagnoses.length} diagnósticos
            </span>
          </div>
          <HBarChart items={topDiagnoses} color="#2563EB" />
        </div>

        {/* Top 10 Medicamentos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                Top 10 Medicamentos más Prescritos
              </h2>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                Por frecuencia en recetas emitidas
              </p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
              {topMedications.length} medicamentos
            </span>
          </div>
          <HBarChart items={topMedications} color="#0D9488" />
        </div>
      </div>

      {/* ── Section 5: Tendencia de Consultas ───────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Tendencia de Consultas</h2>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Citas agendadas por mes (últimos 6 meses)</p>
          </div>
          <TrendingUp size={18} className="text-primary" />
        </div>
        <TrendChart data={trendData} />
      </div>

      {/* ── Section 6: Indicadores de Gestión ───────────────────────────────── */}
      <div>
        <h2 className="font-bold text-gray-900 dark:text-white mb-3">Indicadores de Gestión</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Tasa Completación */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wide">
                Completación
              </span>
            </div>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-1">
              {overview.completionRate}%
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-300 mb-3">Citas completadas vs total</p>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${overview.completionRate}%` }}
              />
            </div>
          </div>

          {/* Tasa Cancelación */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wide">
                Cancelación
              </span>
            </div>
            <p className="text-4xl font-bold text-orange-500 dark:text-orange-400 mb-1">
              {overview.cancellationRate}%
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-300 mb-3">Citas canceladas vs total</p>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-orange-500 h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${overview.cancellationRate}%` }}
              />
            </div>
          </div>

          {/* No Asistieron */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wide">
                No Asistieron
              </span>
            </div>
            <p className="text-4xl font-bold text-red-500 dark:text-red-400 mb-1">
              {overview.noShowRate}%
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-300 mb-3">Pacientes que no se presentaron</p>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-red-500 h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${overview.noShowRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
