'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Certificate {
  id: string
  date: string
  content: string
  diagnosis: string | null
  treatment: string | null
  restDays: number | null
}

export default function PatientCertificadosPage() {
  const { id } = useParams<{ id: string }>()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [viewingId, setViewingId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/certificates?patientId=${id}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setCertificates(data.certificates ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

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
            ← Volver a certificados
          </button>
        </div>
        <iframe
          src={`/certificates/${viewingId}/imprimir`}
          className="flex-1 w-full rounded-2xl border border-gray-200 dark:border-gray-700"
          style={{ minHeight: '600px' }}
        />
      </div>
    )
  }

  if (certificates.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
        <p className="text-4xl mb-4">📄</p>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sin certificados registrados</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Los certificados médicos emitidos a este paciente aparecerán aquí.
        </p>
        <Link href={`/certificates/new?patientId=${id}`} className="btn-primary">
          Nuevo certificado
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total} certificado{total !== 1 ? 's' : ''} en total
        </p>
        <Link href={`/certificates/new?patientId=${id}`} className="btn-primary text-sm py-1.5">
          + Nuevo certificado
        </Link>
      </div>

      {certificates.map((cert) => (
        <div
          key={cert.id}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
          onClick={() => setViewingId(cert.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {new Date(cert.date).toLocaleDateString('es-EC', {
                    timeZone: 'America/Guayaquil',
                    dateStyle: 'long',
                  })}
                </p>
                {cert.restDays != null && cert.restDays > 0 && (
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full">
                    {cert.restDays} día{cert.restDays !== 1 ? 's' : ''} de reposo
                  </span>
                )}
              </div>
              {cert.diagnosis && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cert.diagnosis}</p>
              )}
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{cert.content}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <Link
                href={`/certificates/${cert.id}/imprimir`}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors"
              >
                🖨️ Imprimir
              </Link>
            </div>
          </div>
          <p className="mt-3 text-xs text-primary/60 text-right">Clic para ver certificado →</p>
        </div>
      ))}
    </div>
  )
}
