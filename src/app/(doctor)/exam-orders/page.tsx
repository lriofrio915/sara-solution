'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EXAM_CATEGORIES } from '@/lib/exam-categories'

interface ExamOrder {
  id: string
  date: string
  exams: Record<string, string[]>
  patient: { id: string; name: string; documentId: string | null }
}

function countExams(exams: Record<string, string[]>) {
  return Object.values(exams).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)
}

function topCategories(exams: Record<string, string[]>): string {
  const cats = EXAM_CATEGORIES.filter(c => (exams[c.key] ?? []).length > 0).map(c => c.label)
  if (cats.length === 0) return '—'
  if (cats.length <= 2) return cats.join(', ')
  return `${cats.slice(0, 2).join(', ')} +${cats.length - 2}`
}

export default function ExamOrdersPage() {
  const router = useRouter()
  const [items, setItems] = useState<ExamOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/exam-orders?limit=50')
      const data = await res.json()
      setItems(data.orders ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/exam-orders/${id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(p => p.id !== id))
      setTotal(prev => prev - 1)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Órdenes de Examen</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {total > 0 ? `${total} orden${total !== 1 ? 'es' : ''} emitida${total !== 1 ? 's' : ''}` : 'Solicitudes de exámenes de laboratorio'}
          </p>
        </div>
        <Link href="/exam-orders/new" className="btn-primary flex-shrink-0">+ Nueva orden</Link>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <p className="text-5xl mb-4">🔬</p>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No hay órdenes aún</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Emite tu primera orden de exámenes de laboratorio.</p>
          <Link href="/exam-orders/new" className="btn-primary">Nueva orden</Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <span>Fecha</span>
            <span>Paciente</span>
            <span>Categorías</span>
            <span className="text-center">Exámenes</span>
            <span />
            <span />
          </div>
          {items.map((item, i) => (
            <div key={item.id}
              onClick={() => router.push(`/exam-orders/${item.id}/imprimir`)}
              className={`flex flex-col md:grid md:grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-2 md:gap-4 px-6 py-4 items-start md:items-center cursor-pointer ${
                i < items.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''
              } hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors`}>
              <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {new Date(item.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.patient.name}</p>
                {item.patient.documentId && <p className="text-xs text-gray-400">{item.patient.documentId}</p>}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{topCategories(item.exams)}</div>
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {countExams(item.exams)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); router.push(`/exam-orders/${item.id}/imprimir`) }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-primary hover:bg-primary/5 transition-colors whitespace-nowrap">
                Ver / Imprimir
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                disabled={deletingId === item.id}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-50">
                {deletingId === item.id ? '...' : 'Eliminar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
