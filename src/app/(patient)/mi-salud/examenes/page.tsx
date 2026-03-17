'use client'

import { useState, useEffect } from 'react'

interface ExamOrder {
  id: string
  date: string
  notes: string | null
  exams: Record<string, string[]>
  otrosExams: string | null
}

const SECTION_LABELS: Record<string, string> = {
  hematologia: 'Hematología', bioquimica: 'Bioquímica', orina: 'Orina',
  coagulacion: 'Coagulación', hormonas: 'Hormonas', inmunologia: 'Inmunología',
  microbiologia: 'Microbiología', imagenologia: 'Imagenología',
}

export default function PatientExamenesPage() {
  const [orders, setOrders] = useState<ExamOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/patient/me/exam-orders')
      .then((r) => r.json())
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center pt-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-4 pb-20 sm:pb-0">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🔬 Mis Órdenes de Examen</h1>

      {!orders.length ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <p className="text-4xl mb-3">🔬</p>
          <p className="font-medium">No tienes órdenes de examen</p>
        </div>
      ) : (
        orders.map((order) => {
          const examSections = Object.entries(order.exams).filter(([, v]) => Array.isArray(v) && v.length > 0)
          const total = examSections.reduce((acc, [, v]) => acc + v.length, 0) + (order.otrosExams ? 1 : 0)

          return (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {new Date(order.date).toLocaleDateString('es-EC', { dateStyle: 'long' })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{total} examen{total !== 1 ? 'es' : ''} solicitado{total !== 1 ? 's' : ''}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round"
                  className={`text-gray-400 transition-transform ${expanded === order.id ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {expanded === order.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-4">
                  {examSections.map(([key, items]) => (
                    <div key={key}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-2">
                        {SECTION_LABELS[key] ?? key}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((exam) => (
                          <span key={exam} className="px-3 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 rounded-full text-xs font-medium border border-violet-100 dark:border-violet-900/30">
                            {exam}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {order.otrosExams && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Otros</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{order.otrosExams}</p>
                    </div>
                  )}
                  {order.notes && (
                    <p className="text-xs text-gray-500 dark:text-slate-300">Nota: {order.notes}</p>
                  )}
                  <button onClick={() => window.print()} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                    🖨️ Imprimir orden
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
