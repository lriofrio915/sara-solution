'use client'

import AttentionForm, { PatientSummary } from '@/components/attention/AttentionForm'

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
  piel?: string
  cabezaCuello?: string
  torax?: string
  abdomen?: string
  extremidades?: string
  neurologico?: string
  observacionesGenerales?: string
  examEvolutionNotes?: string
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
  presentation: string
  dosis: string
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
    insurance: string
    datetime: string
    durationMins: number | null
    motive: string
    evolution: string
    exploration: Record<string, string> | null
    diagnoses: unknown[] | null
    prescriptionData: Record<string, unknown> | null
    exams: Record<string, string[] | string> | null
    images: { url: string; description: string }[] | null
    billing: Record<string, unknown> | null
  }
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

export default function AtencionDetailClient({
  patientId,
  attentionId,
  attention,
  previousAttention,
  doctorEstablishments,
  doctorServices,
  patientSummary,
}: Props) {
  const dt = new Date(attention.datetime)
  const fecha = dt.toISOString().slice(0, 10)
  // Use UTC time to match how it was saved (ISO string without timezone = UTC on server)
  const hora = dt.toISOString().slice(11, 16)

  const prescriptionData = attention.prescriptionData as {
    items?: PrescriptionItem[]
    validUntil?: string
    nextAppointment?: string
    notes?: string
    diagnosis?: string | string[]
  } | null

  const billingData = attention.billing as {
    items?: BillingItem[]
    status?: string
  } | null

  const explorationRaw = attention.exploration as ExplorationData | null

  const initialData = {
    establishment: attention.establishment,
    service: attention.service,
    insurance: attention.insurance,
    fecha,
    hora,
    motive: attention.motive,
    evolution: attention.evolution,
    exploration: explorationRaw ? {
      peso: explorationRaw.peso ?? '',
      talla: explorationRaw.talla ?? '',
      imc: explorationRaw.imc ?? '',
      pasSistolica: explorationRaw.pasSistolica ?? '',
      pasDiastolica: explorationRaw.pasDiastolica ?? '',
      frecuenciaCardiaca: explorationRaw.frecuenciaCardiaca ?? '',
      frecuenciaRespiratoria: explorationRaw.frecuenciaRespiratoria ?? '',
      temperatura: explorationRaw.temperatura ?? '',
      saturacionO2: explorationRaw.saturacionO2 ?? '',
      perimetroCefalico: explorationRaw.perimetroCefalico ?? '',
      piel: explorationRaw.piel ?? '',
      cabezaCuello: explorationRaw.cabezaCuello ?? '',
      torax: explorationRaw.torax ?? '',
      abdomen: explorationRaw.abdomen ?? '',
      extremidades: explorationRaw.extremidades ?? '',
      neurologico: explorationRaw.neurologico ?? '',
      observacionesGenerales: explorationRaw.observacionesGenerales ?? '',
    } : undefined,
    diagnoses: (attention.diagnoses as Diagnosis[]) ?? [],
    prescriptionItems: prescriptionData?.items ?? [],
    prescriptionDiagnosis: Array.isArray(prescriptionData?.diagnosis)
      ? prescriptionData.diagnosis as string[]
      : (prescriptionData?.diagnosis ? [prescriptionData.diagnosis as string] : []),
    prescriptionValidUntil: prescriptionData?.validUntil ?? '',
    prescriptionNextAppointment: prescriptionData?.nextAppointment ?? '',
    prescriptionNotes: prescriptionData?.notes ?? 'Recomendaciones:\nSignos de Alarma:\nAlergias:',
    exams: attention.exams ?? undefined,
    images: attention.images ?? [],
    examEvolutionNotes: explorationRaw?.examEvolutionNotes ?? '',
    billing: billingData?.items ?? [],
    billingStatus: billingData?.status ?? 'Pendiente',
    // Restore otrosExams from namespaced keys stored in the exams JSON
    otrosExams: Object.fromEntries(
      Object.entries(attention.exams ?? {})
        .filter(([k]) => k.endsWith('__otros'))
        .map(([k, v]) => [k.replace('__otros', ''), String(v)])
    ),
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Atención — {dt.toLocaleDateString('es-EC', { timeZone: 'UTC', dateStyle: 'long' })}
        </h2>
      </div>
      <AttentionForm
        patientId={patientId}
        attentionId={attentionId}
        initialData={initialData}
        previousAttention={previousAttention}
        doctorEstablishments={doctorEstablishments}
        doctorServices={doctorServices}
        patientSummary={patientSummary}
      />
    </div>
  )
}
