'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Certificate {
  id: string
  date: string
  diagnosis: string | null
  restDays: number | null
  content: string
  patient: { id: string; name: string; documentId: string | null }
}

export default function CertificatesPage() {
  const router = useRouter()
  const [items, setItems] = useState<Certificate[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/certificates?limit=50')
      const data = await res.json()
      setItems(data.certificates ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/certificates/${id}`, { method: 'DELETE' })
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Certificados Médicos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {total > 0 ? `${total} certificado${total !== 1 ? 's' : ''} emitido${total !== 1 ? 's' : ''}` : 'Certificados médicos digitales'}
          </p>
        </div>
        <Link href="/certificates/new" className="btn-primary flex-shrink-0">+ Nuevo certificado</Link>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <p className="text-5xl mb-4">📋</p>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No hay certificados aún</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Emite tu primer certificado médico digital.</p>
          <Link href="/certificates/new" className="btn-primary">Nuevo certificado</Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <span>Fecha</span>
            <span>Paciente</span>
            <span>Diagnóstico</span>
            <span className="text-center">Reposo</span>
            <span />
            <span />
          </div>
          {items.map((item, i) => (
            <div key={item.id}
              className={`flex flex-col md:grid md:grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-2 md:gap-4 px-6 py-4 items-start md:items-center ${
                i < items.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''
              } hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors`}>
              <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {new Date(item.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.patient.name}</p>
                {item.patient.documentId && <p className="text-xs text-gray-400">{item.patient.documentId}</p>}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                {item.diagnosis ?? item.content.slice(0, 60)}
              </div>
              <div className="text-center">
                {item.restDays ? (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                    {item.restDays}d
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                )}
              </div>
              <button
                onClick={() => router.push(`/certificates/${item.id}/imprimir`)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-primary hover:bg-primary/5 transition-colors whitespace-nowrap">
                Ver / Imprimir
              </button>
              <button
                onClick={() => handleDelete(item.id)}
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
