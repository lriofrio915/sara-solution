'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export interface Prescription {
  id: string
  date: string
  diagnosis: string | null
  attentionId: string | null
  medications: Array<{ name: string; dose: string; frequency: string; duration: string }>
  patient: { id: string; name: string; documentId: string | null }
}

export default function PrescriptionsListClient({
  initialItems,
  initialTotal,
}: {
  initialItems: Prescription[]
  initialTotal: number
}) {
  const router = useRouter()
  // Datos ya renderizados por el servidor: no hay fetch al montar.
  const [items, setItems] = useState<Prescription[]>(initialItems)
  const [total, setTotal] = useState(initialTotal)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta receta? Esta acción no se puede deshacer.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/prescriptions/${id}`, { method: 'DELETE' })
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recetario</h1>
          <p className="text-gray-500 dark:text-slate-300 text-sm mt-0.5">
            {total > 0 ? `${total} receta${total !== 1 ? 's' : ''} emitida${total !== 1 ? 's' : ''}` : 'Gestión de recetas médicas'}
          </p>
        </div>
      </div>

      {items.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <p className="text-5xl mb-4">💊</p>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No hay recetas aún</h3>
          <p className="text-gray-500 dark:text-slate-300 mb-6">Las recetas se generan desde la atención del paciente (pestaña Prescripción).</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wide">
            <span>Fecha</span>
            <span>Paciente</span>
            <span>Medicamentos</span>
            <span />
          </div>
          {items.map((item, i) => (
            <div key={item.id}
              className={`flex flex-col md:grid md:grid-cols-[auto_1fr_1fr_auto] gap-2 md:gap-4 px-6 py-4 items-start md:items-center ${
                i < items.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''
              } hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors`}>
              <div className="text-sm text-gray-500 dark:text-slate-300 whitespace-nowrap">
                {new Date(item.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.patient.name}</p>
                {item.patient.documentId && <p className="text-xs text-gray-400">{item.patient.documentId}</p>}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {(item.medications as Array<{ name: string }>).slice(0, 2).map(m => m.name).join(', ')}
                {(item.medications as Array<unknown>).length > 2 && ` +${(item.medications as Array<unknown>).length - 2} más`}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.attentionId && (
                  <button
                    onClick={() => router.push(`/patients/${item.patient.id}/atenciones/${item.attentionId}`)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap">
                    Ver Atención
                  </button>
                )}
                <button
                  onClick={() => router.push(`/prescriptions/${item.id}/imprimir`)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-primary hover:bg-primary/5 transition-colors whitespace-nowrap">
                  Ver Receta
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
