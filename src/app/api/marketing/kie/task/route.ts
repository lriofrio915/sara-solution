import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getTaskResult, getVeoTaskResult, SARA_CREDIT_COSTS } from '@/lib/kie-ai'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')
  const type = (searchParams.get('type') ?? 'IMAGE') as 'IMAGE' | 'VIDEO'

  if (!taskId) return NextResponse.json({ error: 'taskId requerido' }, { status: 400 })

  try {
    const result = type === 'VIDEO'
      ? await getVeoTaskResult(taskId)
      : await getTaskResult(taskId)
    const forceRefund = searchParams.get('forceRefund') === '1'

    // If task failed (or caller forces a refund for an already-charged task), refund credits
    if (result.state === 'fail' || forceRefund) {
      const doctor = await prisma.doctor.findFirst({
        where: { OR: [{ id: user.id }, { email: user.email! }] },
        select: { id: true },
      })
      if (doctor) {
        const refundCreditsParam = parseInt(searchParams.get('refundCredits') ?? '0')
        const cost = type === 'VIDEO'
          ? (refundCreditsParam > 0 ? refundCreditsParam : SARA_CREDIT_COSTS.VIDEO_BY_CLIPS[1])
          : SARA_CREDIT_COSTS.IMAGE
        // Only refund once per taskId — skip if a RECHARGE row with this kieTaskId already exists
        const existing = await prisma.creditTransaction.findFirst({
          where: { doctorId: doctor.id, kieTaskId: taskId, type: 'RECHARGE' },
          select: { id: true },
        }).catch(() => null)
        if (!existing) {
          await prisma.doctorCredit.update({
            where: { doctorId: doctor.id },
            data: { credits: { increment: cost } },
          }).catch(() => {})
          await prisma.creditTransaction.create({
            data: {
              doctorId: doctor.id,
              type: 'RECHARGE',
              credits: cost,
              description: forceRefund && result.state !== 'fail'
                ? `Reembolso por resultado vacío (${taskId})`
                : `Reembolso por fallo en generación (${taskId})`,
              kieTaskId: taskId,
            },
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({
      state: result.state,
      resultUrl: result.resultUrl,
      failReason: result.failReason,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('KIE task error:', message)
    return NextResponse.json({ error: `Error al consultar tarea: ${message}` }, { status: 500 })
  }
}
