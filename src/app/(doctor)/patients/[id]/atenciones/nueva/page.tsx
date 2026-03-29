import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import AttentionFormClient from './AttentionFormClient'

export const dynamic = 'force-dynamic'

function parseEstablishments(doc: { establishmentName?: string | null; branches?: string | null }): string[] {
  const list: string[] = []
  if (doc.establishmentName?.trim()) list.push(doc.establishmentName.trim())
  if (doc.branches) {
    try {
      const branches = JSON.parse(doc.branches) as { name?: string; address?: string }[]
      for (const b of branches) {
        if (b.name?.trim()) list.push(b.name.trim())
      }
    } catch { /* ignore */ }
  }
  return list
}

function parseServices(doc: { services?: string | null }): string[] {
  if (!doc.services) return []
  try {
    const parsed = JSON.parse(doc.services) as { name?: string }[]
    return parsed.map(s => s.name ?? '').filter(Boolean)
  } catch {
    // plain text fallback (from onboarding)
    return doc.services.split('\n').map(s => s.trim()).filter(Boolean)
  }
}

function buildHeredoFamiliarSummary(hf: Record<string, unknown> | null): string {
  if (!hf) return ''
  const diseases = [
    ['diabetes', 'Diabetes'], ['hipertension', 'Hipertensión'], ['cancer', 'Cáncer'],
    ['cardiopatias', 'Cardiopatías'], ['enfermedadesMentales', 'Enf. Mentales'],
    ['enfermedadesRenales', 'Enf. Renales'], ['obesidad', 'Obesidad'],
    ['epilepsia', 'Epilepsia'], ['asma', 'Asma'], ['otros', 'Otros'],
  ]
  const parts: string[] = []
  for (const [key, label] of diseases) {
    if (hf[key]) {
      const relativo = hf[`${key}Relativo`] as string | undefined
      parts.push(relativo ? `${label} (${relativo})` : label)
    }
  }
  return parts.join(', ')
}

export default async function NuevaAtencionPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, establishmentName: true, branches: true, services: true },
  })
  if (!doctor) redirect('/login')

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, doctorId: doctor.id },
    select: { id: true, name: true, allergies: true },
  })
  if (!patient) redirect('/patients')

  // Get previous attention
  const previousAttention = await prisma.attention.findFirst({
    where: { patientId: params.id, doctorId: doctor.id },
    orderBy: { datetime: 'desc' },
    select: {
      datetime: true,
      motive: true,
      evolution: true,
      diagnoses: true,
    },
  })

  // Load chart for patient summary
  const chart = await prisma.patientChart.findUnique({
    where: { patientId: params.id },
    select: { currentMedication: true, personalPathologic: true, heredoFamiliar: true },
  })

  const hf = chart?.heredoFamiliar as Record<string, unknown> | null
  const pp = chart?.personalPathologic as Record<string, unknown> | null
  const personalPathologicText = pp?.texto as string ?? ''

  return (
    <AttentionFormClient
      patientId={params.id}
      previousAttention={previousAttention ? {
        datetime: previousAttention.datetime.toISOString(),
        motive: previousAttention.motive,
        evolution: previousAttention.evolution,
        diagnoses: previousAttention.diagnoses,
      } : null}
      doctorEstablishments={parseEstablishments(doctor)}
      doctorServices={parseServices(doctor)}
      patientSummary={{
        allergies: patient.allergies,
        currentMedication: chart?.currentMedication ?? '',
        personalPathologic: personalPathologicText,
        heredoFamiliar: buildHeredoFamiliarSummary(hf),
      }}
    />
  )
}
