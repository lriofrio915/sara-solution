'use client'

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
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Nueva Atención</h2>
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
