'use client'

import { useState } from 'react'
import Link from 'next/link'
import AttentionForm, { PatientSummary } from '@/components/attention/AttentionForm'

interface Props {
  patientId: string
  previousAttention: {
    datetime: string
    motive: string | null
    evolution: string | null
    diagnoses: unknown
  } | null
  doctorEstablishments?: string[]
  doctorServices?: string[]
  patientSummary?: PatientSummary
}

export default function AttentionFormClient({
  patientId,
  previousAttention,
  doctorEstablishments,
  doctorServices,
  patientSummary,
}: Props) {
  const [bannerDismissed, setBannerDismissed] = useState(false)

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Nueva Atención</h2>

      {!bannerDismissed && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-0.5">Recomendación</p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Crea una cita para este paciente antes de registrar la atención para mantener el historial ordenado.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/appointments/new?patientId=${patientId}`}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Crear cita primero
            </Link>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="px-3 py-1.5 bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-600 text-xs font-semibold rounded-xl hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors"
            >
              Continuar sin cita
            </button>
          </div>
        </div>
      )}

      <AttentionForm
        patientId={patientId}
        previousAttention={previousAttention}
        doctorEstablishments={doctorEstablishments}
        doctorServices={doctorServices}
        patientSummary={patientSummary}
      />
    </div>
  )
}
