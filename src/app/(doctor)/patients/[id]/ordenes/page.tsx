'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { EXAM_CATEGORIES } from '@/lib/exam-categories'

interface ExamOrder {
  id: string
  date: string
  exams: Record<string, string[]>
  otrosExams: string | null
  notes: string | null
}

export default function PatientOrdenesPage() {
  const { id } = useParams<{ id: string }>()
  const [orders, setOrders] = useState<ExamOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [viewingId, setViewingId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/exam-orders?patientId=${id}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.orders ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  function countExams(exams: Record<string, string[]>): number {
    return Object.values(exams).reduce((acc, arr) => acc + arr.length, 0)
  }

  function getCategories(exams: Record<string, string[]>): string[] {
    return EXAM_CATEGORIES
      .filter((cat) => (exams[cat.key]?.length ?? 0) > 0)
      .map((cat) => cat.label)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (viewingId) {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setViewingId(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
          >
            ← Volver a órdenes
          </button>
        </div>
        <iframe
          src={`/exam-orders/${viewingId}/imprimir`}
          className="flex-1 w-full rounded-2xl border border-gray-200 dark:border-gray-700"
          style={{ minHeight: '600px' }}
        />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
        <p className="text-4xl mb-4">🧪</p>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sin órdenes registradas</h3>
        <p className="text-gray-500 dark:text-slate-300 mb-6">
          Las órdenes de exámenes emitidas a este paciente aparecerán aquí.
        </p>
        <Link href={`/exam-orders/new?patientId=${id}`} className="btn-primary">
          Nueva orden de exámenes
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-300">
          {total} orden{total !== 1 ? 'es' : ''} en total
        </p>
        <Link href={`/exam-orders/new?patientId=${id}`} className="btn-primary text-sm py-1.5">
          + Nueva orden
        </Link>
      </div>

      {orders.map((order) => {
        const categories = getCategories(order.exams)
        const examCount = countExams(order.exams)
        return (
          <div
            key={order.id}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
            onClick={() => setViewingId(order.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {new Date(order.date).toLocaleDateString('es-EC', {
                    timeZone: 'America/Guayaquil',
                    dateStyle: 'long',
                  })}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-300 mt-0.5">
                  {examCount} examen{examCount !== 1 ? 'es' : ''}
                  {categories.length > 0 && ` · ${categories.join(', ')}`}
                </p>
                {order.otrosExams && (
                  <p className="text-xs text-gray-400 mt-1 italic">Otros: {order.otrosExams}</p>
                )}
                {order.notes && (
                  <p className="text-xs text-gray-400 mt-1">{order.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Link
                  href={`/exam-orders/${order.id}/imprimir`}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors"
                >
                  🖨️ Imprimir
                </Link>
              </div>
            </div>
            {categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-primary/60 text-right">Clic para ver orden →</p>
          </div>
        )
      })}
    </div>
  )
}
