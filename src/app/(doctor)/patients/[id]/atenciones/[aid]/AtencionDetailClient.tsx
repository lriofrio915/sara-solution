'use client'

import AttentionForm from '@/components/attention/AttentionForm'

interface ExplorationData {
  peso?: string
  talla?: string
  imc?: string
  pasSistolica?: string
  pasDiastolica?: string
  frecuenciaCardiaca?: string
  frecuenciaRespiratoria?: string
  temperatura?: string
  saturacionO2?: string
  perimetroCefalico?: string
  cabezaCuello?: string
  torax?: string
  abdomen?: string
  extremidades?: string
  neurologico?: string
  observacionesGenerales?: string
}

interface Diagnosis {
  cie10Code: string
  cie10Desc: string
  observations: string
  isNew: boolean
  isDefinitive: boolean
}

interface PrescriptionItem {
  medicine: string
  quantity: string
  indications: string
}

interface BillingItem {
  description: string
  quantity: number
  unitPrice: number
}

interface Props {
  patientId: string
  attentionId: string
  attention: {
    establishment: string
    service: string
    attentionType: string
    insurance: string
    datetime: string
    nextAppointment: string
    durationMins: number | null
    motive: string
    evolution: string
    exploration: Record<string, string> | null
    diagnoses: unknown[] | null
    prescriptionData: Record<string, unknown> | null
    exams: Record<string, string[]> | null
    images: { url: string; description: string }[] | null
    billing: Record<string, unknown> | null
  }
  previousAttention: {
    datetime: string
    motive: string | null
    evolution: string | null
    diagnoses: unknown
  } | null
}

export default function AtencionDetailClient({ patientId, attentionId, attention, previousAttention }: Props) {
  const dt = new Date(attention.datetime)
  const fecha = dt.toISOString().slice(0, 10)
  const hora = dt.toTimeString().slice(0, 5)

  const prescriptionData = attention.prescriptionData as {
    items?: PrescriptionItem[]
    validUntil?: string
    notes?: string
  } | null

  const billingData = attention.billing as {
    items?: BillingItem[]
    status?: string
  } | null

  const initialData = {
    establishment: attention.establishment,
    service: attention.service,
    attentionType: attention.attentionType,
    insurance: attention.insurance,
    fecha,
    hora,
    nextAppointment: attention.nextAppointment ? attention.nextAppointment.slice(0, 10) : '',
    motive: attention.motive,
    evolution: attention.evolution,
    exploration: attention.exploration ? {
      peso: (attention.exploration as ExplorationData).peso ?? '',
      talla: (attention.exploration as ExplorationData).talla ?? '',
      imc: (attention.exploration as ExplorationData).imc ?? '',
      pasSistolica: (attention.exploration as ExplorationData).pasSistolica ?? '',
      pasDiastolica: (attention.exploration as ExplorationData).pasDiastolica ?? '',
      frecuenciaCardiaca: (attention.exploration as ExplorationData).frecuenciaCardiaca ?? '',
      frecuenciaRespiratoria: (attention.exploration as ExplorationData).frecuenciaRespiratoria ?? '',
      temperatura: (attention.exploration as ExplorationData).temperatura ?? '',
      saturacionO2: (attention.exploration as ExplorationData).saturacionO2 ?? '',
      perimetroCefalico: (attention.exploration as ExplorationData).perimetroCefalico ?? '',
      cabezaCuello: (attention.exploration as ExplorationData).cabezaCuello ?? '',
      torax: (attention.exploration as ExplorationData).torax ?? '',
      abdomen: (attention.exploration as ExplorationData).abdomen ?? '',
      extremidades: (attention.exploration as ExplorationData).extremidades ?? '',
      neurologico: (attention.exploration as ExplorationData).neurologico ?? '',
      observacionesGenerales: (attention.exploration as ExplorationData).observacionesGenerales ?? '',
    } : undefined,
    diagnoses: (attention.diagnoses as Diagnosis[]) ?? [],
    prescriptionItems: prescriptionData?.items ?? [],
    prescriptionValidUntil: prescriptionData?.validUntil ?? '',
    prescriptionNotes: prescriptionData?.notes ?? 'Recomendaciones:\nSignos de Alarma:\nAlergias:',
    exams: attention.exams ?? undefined,
    images: attention.images ?? [],
    billing: billingData?.items ?? [],
    billingStatus: billingData?.status ?? 'Pendiente',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Atención — {dt.toLocaleDateString('es-EC', { dateStyle: 'long' })}
        </h2>
      </div>
      <AttentionForm
        patientId={patientId}
        attentionId={attentionId}
        initialData={initialData}
        previousAttention={previousAttention}
      />
    </div>
  )
}
