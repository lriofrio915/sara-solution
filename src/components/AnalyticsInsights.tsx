'use client'

import { useEffect, useState } from 'react'
import { Brain, HelpCircle, TrendingUp } from 'lucide-react'

interface DiagItem { name: string; count: number }

interface AnalyticsData {
  overview: {
    patientsThisMonth: number
    patientsLastMonth: number
    apptThisMonth: number
    apptLastMonth: number
    completionRate: number
    noShowRate: number
    prescThisMonth: number
    totalPrescriptions: number
  }
  topDiagnoses: DiagItem[]
  topMedications: DiagItem[]
}

function HBarChart({ items, color }: { items: DiagItem[]; color: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-slate-400 text-center py-8">Sin datos suficientes aún</p>
  }
  const max = Math.max(...items.map(i => i.count), 1)
  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => (
        <div key={idx}>
          <div className="flex justify-between items-center mb-1 gap-2">
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1" title={item.name}>{item.name}</span>
            <span className="text-xs font-bold text-gray-500 dark:text-slate-300 flex-shrink-0">{item.count}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${(item.count / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
}

export default function AnalyticsInsights() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { overview, topDiagnoses, topMedications } = data

  const qaCards = [
    { question: '¿Cuál es mi diagnóstico más frecuente?',    answer: topDiagnoses[0]?.name ?? 'Sin datos aún' },
    { question: '¿Qué medicamento prescribo más?',           answer: topMedications[0]?.name ?? 'Sin datos aún' },
    { question: '¿Cuántos pacientes nuevos tuve este mes?',  answer: `${overview.patientsThisMonth} pacientes` },
    { question: '¿Cuál es mi tasa de ausentismo?',           answer: `${overview.noShowRate}% de citas` },
    { question: '¿Cuántas consultas completé este mes?',     answer: `${overview.apptThisMonth} consultas` },
    { question: '¿Cuántas recetas emití este mes?',          answer: `${overview.prescThisMonth} recetas` },
  ]

  return (
    <div className="space-y-6">

      {/* Sara IA responde */}
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
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex gap-3">
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

      {/* Top diagnósticos y medicamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Top 10 Diagnósticos del Año</h2>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Por frecuencia en atenciones médicas</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
              {topDiagnoses.length} diagnósticos
            </span>
          </div>
          <HBarChart items={topDiagnoses} color="#2563EB" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Top 10 Medicamentos Prescritos</h2>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Por frecuencia en recetas emitidas</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
              {topMedications.length} medicamentos
            </span>
          </div>
          <HBarChart items={topMedications} color="#0D9488" />
        </div>
      </div>

    </div>
  )
}
