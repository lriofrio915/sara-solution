'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Medication {
  name: string
  dose?: string
  frequency?: string
  duration?: string
  notes?: string
}

interface Prescription {
  id: string
  date: string
  diagnosis: string | null
  medications: Medication[]
  instructions: string | null
}

export default function PatientPrescriptionsPage() {
  const { id } = useParams<{ id: string }>()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetch(`/api/prescriptions?patientId=${id}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setPrescriptions(data.prescriptions ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (prescriptions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
        <p className="text-4xl mb-4">💊</p>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sin recetas registradas</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Las recetas emitidas en las atenciones aparecerán aquí automáticamente.
        </p>
        <Link href={`/patients/${id}/atenciones/nueva`} className="btn-primary">
          Nueva atención
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {total} receta{total !== 1 ? 's' : ''} en total
      </p>

      {prescriptions.map((rx) => {
        const meds = Array.isArray(rx.medications) ? rx.medications : []
        return (
          <div
            key={rx.id}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {new Date(rx.date).toLocaleDateString('es-EC', {
                    timeZone: 'America/Guayaquil',
                    dateStyle: 'long',
                  })}
                </p>
                {rx.diagnosis && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rx.diagnosis}</p>
                )}
              </div>
              <span className="flex-shrink-0 text-xs px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full font-medium">
                {meds.length} medicamento{meds.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {meds.map((med, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
                >
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">💊</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{med.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {[med.dose, med.frequency, med.duration].filter(Boolean).join(' · ')}
                    </p>
                    {med.notes && (
                      <p className="text-xs text-gray-400 italic mt-0.5">{med.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {rx.instructions && (
              <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  Indicaciones
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {rx.instructions}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
