'use client'

import AttentionForm from '@/components/attention/AttentionForm'

interface Props {
  patientId: string
  previousAttention: {
    datetime: string
    motive: string | null
    evolution: string | null
    diagnoses: unknown
  } | null
}

export default function AttentionFormClient({ patientId, previousAttention }: Props) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Nueva Atención</h2>
      <AttentionForm patientId={patientId} previousAttention={previousAttention} />
    </div>
  )
}
