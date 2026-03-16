import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import AtencionDetailClient from './AtencionDetailClient'

export const dynamic = 'force-dynamic'

export default async function AtencionDetailPage({
  params,
}: {
  params: { id: string; aid: string }
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
  if (!doctor) redirect('/login')

  const attention = await prisma.attention.findFirst({
    where: { id: params.aid, patientId: params.id, doctorId: doctor.id },
  })
  if (!attention) redirect(`/patients/${params.id}/atenciones`)

  // Get previous attention (the one before this one)
  const previousAttention = await prisma.attention.findFirst({
    where: {
      patientId: params.id,
      doctorId: doctor.id,
      datetime: { lt: attention.datetime },
    },
    orderBy: { datetime: 'desc' },
    select: {
      datetime: true,
      motive: true,
      evolution: true,
      diagnoses: true,
    },
  })

  // Serialize attention data
  const attData = attention as Record<string, unknown>

  return (
    <AtencionDetailClient
      patientId={params.id}
      attentionId={params.aid}
      attention={{
        establishment: (attData.establishment as string) ?? '',
        service: (attData.service as string) ?? 'Consulta',
        attentionType: (attData.attentionType as string) ?? '',
        insurance: (attData.insurance as string) ?? '',
        datetime: attention.datetime.toISOString(),
        nextAppointment: attention.nextAppointment?.toISOString() ?? '',
        durationMins: attention.durationMins,
        motive: attention.motive ?? '',
        evolution: attention.evolution ?? '',
        exploration: attData.exploration as Record<string, string> | null,
        diagnoses: attData.diagnoses as unknown[] | null,
        prescriptionData: attData.prescriptionData as Record<string, unknown> | null,
        exams: attData.exams as Record<string, string[]> | null,
        images: attData.images as { url: string; description: string }[] | null,
        billing: attData.billing as Record<string, unknown> | null,
      }}
      previousAttention={previousAttention ? {
        datetime: previousAttention.datetime.toISOString(),
        motive: previousAttention.motive,
        evolution: previousAttention.evolution,
        diagnoses: previousAttention.diagnoses,
      } : null}
    />
  )
}
