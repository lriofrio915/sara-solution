'use client'

import { useState, useEffect } from 'react'

interface Medication {
  name: string
  dose: string
  frequency: string
  duration: string
  notes?: string
}

interface Prescription {
  id: string
  date: string
  diagnosis: string | null
  instructions: string | null
  medications: Medication[]
}

export default function PatientRecetasPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/patient/me/prescriptions')
      .then((r) => r.json())
      .then(setPrescriptions)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center pt-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-4 pb-20 sm:pb-0">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">💊 Mis Recetas</h1>

      {!prescriptions.length ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <p className="text-4xl mb-3">💊</p>
          <p className="font-medium">No tienes recetas emitidas</p>
        </div>
      ) : (
        prescriptions.map((rx) => (
          <div key={rx.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === rx.id ? null : rx.id)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {new Date(rx.date).toLocaleDateString('es-EC', { dateStyle: 'long' })}
                </p>
                {rx.diagnosis && <p className="text-xs text-gray-400 mt-0.5">{rx.diagnosis}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{rx.medications.length} medicamento{rx.medications.length !== 1 ? 's' : ''}</p>
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-gray-400 transition-transform ${expanded === rx.id ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {expanded === rx.id && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-4">
                <div className="space-y-3">
                  {rx.medications.map((med, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{med.name}</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <p className="text-xs text-gray-400">Dosis</p>
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{med.dose || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Frecuencia</p>
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{med.frequency || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Duración</p>
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{med.duration || '—'}</p>
                        </div>
                      </div>
                      {med.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Nota: {med.notes}</p>}
                    </div>
                  ))}
                </div>
                {rx.instructions && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Indicaciones</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{rx.instructions}</p>
                  </div>
                )}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                >
                  🖨️ Imprimir receta
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
