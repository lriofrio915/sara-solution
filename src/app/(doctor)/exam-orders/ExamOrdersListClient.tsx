'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EXAM_CATEGORIES, IMAGING_CATEGORIES } from '@/lib/exam-categories'

export type ExamOrderType = 'LAB' | 'IMAGING'

export interface ExamOrder {
  id: string
  date: string
  type: ExamOrderType
  exams: Record<string, string[] | string>
  attentionId: string | null
  patient: { id: string; name: string; documentId: string | null }
}

function countExams(exams: Record<string, string[] | string>) {
  return Object.values(exams).reduce<number>((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)
}

// El catálogo depende del tipo de orden: etiquetar una orden de imagen con el catálogo
// de laboratorio la dejaba siempre en "—" aunque tuviera exámenes pedidos.
function topCategories(exams: Record<string, string[] | string>, type: ExamOrderType): string {
  const catalog = type === 'IMAGING' ? IMAGING_CATEGORIES : EXAM_CATEGORIES
  const cats = catalog
    .filter(c => Array.isArray(exams[c.key]) && (exams[c.key] as string[]).length > 0)
    .map(c => c.label)
  if (cats.length === 0) return '—'
  if (cats.length <= 2) return cats.join(', ')
  return `${cats.slice(0, 2).join(', ')} +${cats.length - 2}`
}

export default function ExamOrdersListClient({
  initialItems,
  initialTotal,
}: {
  initialItems: ExamOrder[]
  initialTotal: number
}) {
  const router = useRouter()
  // Datos ya renderizados por el servidor: no hay fetch al montar.
  const [items, setItems] = useState<ExamOrder[]>(initialItems)
  const [total, setTotal] = useState(initialTotal)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta orden de exámenes? Esta acción no se puede deshacer.')) return
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
          <p className="text-gray-500 dark:text-slate-300 text-sm mt-0.5">
            {total > 0 ? `${total} orden${total !== 1 ? 'es' : ''} emitida${total !== 1 ? 's' : ''}` : 'Solicitudes de exámenes de laboratorio e imagen'}
          </p>
        </div>
      </div>

      {items.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <p className="text-5xl mb-4">🔬</p>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No hay órdenes aún</h3>
          <p className="text-gray-500 dark:text-slate-300 mb-6">Las órdenes se generan desde la atención del paciente (pestaña Exámenes).</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wide">
            <span>Fecha</span>
            <span>Paciente</span>
            <span>Categorías</span>
            <span className="text-center">Exámenes</span>
            <span />
          </div>
          {items.map((item, i) => (
            <div key={item.id}
              className={`flex flex-col md:grid md:grid-cols-[auto_1fr_1fr_auto_auto] gap-2 md:gap-4 px-6 py-4 items-start md:items-center ${
                i < items.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''
              } hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors`}>
              <div className="text-sm text-gray-500 dark:text-slate-300 whitespace-nowrap">
                {new Date(item.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.patient.name}</p>
                {item.patient.documentId && <p className="text-xs text-gray-400">{item.patient.documentId}</p>}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                <span className={`inline-block mb-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                  item.type === 'IMAGING'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'
                    : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                }`}>
                  {item.type === 'IMAGING' ? 'Imágenes' : 'Laboratorio'}
                </span>
                <span className="block truncate">{topCategories(item.exams, item.type)}</span>
              </div>
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {countExams(item.exams)}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.attentionId && (
                  <button
                    onClick={() => router.push(`/patients/${item.patient.id}/atenciones/${item.attentionId}`)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap">
                    Ver Atención
                  </button>
                )}
                <button
                  onClick={() => router.push(`/exam-orders/${item.id}/imprimir`)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-primary hover:bg-primary/5 transition-colors whitespace-nowrap">
                  Ver Orden
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-50">
                  {deletingId === item.id ? '...' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
