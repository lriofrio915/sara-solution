import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createVideoTask, SARA_CREDIT_COSTS } from '@/lib/kie-ai'

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
}

export async function POST(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { prompt, socialPostId } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })

  const credit = await prisma.doctorCredit.upsert({
    where: { doctorId: doctor.id },
    update: {},
    create: { doctorId: doctor.id, credits: 0 },
  })

  const cost = SARA_CREDIT_COSTS.VIDEO
  if (credit.credits < cost) {
    return NextResponse.json({ error: 'Créditos insuficientes', code: 'INSUFFICIENT_CREDITS' }, { status: 402 })
  }

  try {
    const { taskId } = await createVideoTask(prompt)

    const updated = await prisma.doctorCredit.update({
      where: { doctorId: doctor.id },
      data: { credits: { decrement: cost } },
    })

    await prisma.creditTransaction.create({
      data: {
        doctorId: doctor.id,
        type: 'VIDEO',
        credits: -cost,
        description: `Video IA generado (Kling 5s)`,
        kieTaskId: taskId,
      },
    })

    void socialPostId // unused for now

    return NextResponse.json({ taskId, creditCost: cost, newCredits: updated.credits })
  } catch (err) {
    console.error('KIE video error:', err)
    return NextResponse.json({ error: 'Error al iniciar la generación de video' }, { status: 500 })
  }
}
