import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getTaskResult, SARA_CREDIT_COSTS } from '@/lib/kie-ai'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')
  const type = (searchParams.get('type') ?? 'IMAGE') as 'IMAGE' | 'VIDEO'

  if (!taskId) return NextResponse.json({ error: 'taskId requerido' }, { status: 400 })

  try {
    const result = await getTaskResult(taskId)

    // If task failed, refund credits
    if (result.state === 'fail') {
      const doctor = await prisma.doctor.findFirst({
        where: { OR: [{ id: user.id }, { email: user.email! }] },
        select: { id: true },
      })
      if (doctor) {
        const refundCreditsParam = parseInt(searchParams.get('refundCredits') ?? '0')
        const cost = type === 'VIDEO'
          ? (refundCreditsParam > 0 ? refundCreditsParam : SARA_CREDIT_COSTS.VIDEO_BY_CLIPS[1])
          : SARA_CREDIT_COSTS.IMAGE
        await prisma.doctorCredit.update({
          where: { doctorId: doctor.id },
          data: { credits: { increment: cost } },
        }).catch(() => {})
        await prisma.creditTransaction.create({
          data: {
            doctorId: doctor.id,
            type: 'RECHARGE',
            credits: cost,
            description: `Reembolso por fallo en generación (${taskId})`,
            kieTaskId: taskId,
          },
        }).catch(() => {})
      }
    }

    return NextResponse.json({ state: result.state, resultUrl: result.resultUrl, recordTaskId: result.recordTaskId })
  } catch (err) {
    console.error('KIE task error:', err)
    return NextResponse.json({ error: 'Error al consultar tarea' }, { status: 500 })
  }
}
