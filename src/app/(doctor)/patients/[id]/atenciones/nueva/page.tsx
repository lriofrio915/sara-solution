import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import AttentionFormClient from './AttentionFormClient'

export const dynamic = 'force-dynamic'

export default async function NuevaAtencionPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
  if (!doctor) redirect('/login')

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, doctorId: doctor.id },
    select: { id: true, name: true },
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

  return (
    <AttentionFormClient
      patientId={params.id}
      previousAttention={previousAttention ? {
        datetime: previousAttention.datetime.toISOString(),
        motive: previousAttention.motive,
        evolution: previousAttention.evolution,
        diagnoses: previousAttention.diagnoses,
      } : null}
    />
  )
}
