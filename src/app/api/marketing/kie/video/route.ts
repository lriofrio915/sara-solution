import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createVideoTask, SARA_CREDIT_COSTS } from '@/lib/kie-ai'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
  if (!doctor) return null
  return { doctor, isAdmin: user.email === SUPERADMIN_EMAIL }
}

export async function POST(req: Request) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { doctor, isAdmin } = auth
  const { prompt, socialPostId } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })

  const cost = SARA_CREDIT_COSTS.VIDEO

  // Regular doctor: check DB balance
  if (!isAdmin) {
    const credit = await prisma.doctorCredit.upsert({
      where: { doctorId: doctor.id },
      update: {},
      create: { doctorId: doctor.id, credits: 0 },
    })
    if (credit.credits < cost) {
      return NextResponse.json({ error: 'Créditos insuficientes', code: 'INSUFFICIENT_CREDITS' }, { status: 402 })
    }
  }

  try {
    const { taskId } = await createVideoTask(prompt)

    if (!isAdmin) {
      // Deduct credits from DB only for regular doctors
      await prisma.doctorCredit.update({
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
    }

    void socialPostId // unused for now

    return NextResponse.json({ taskId, creditCost: cost, newCredits: null })
  } catch (err) {
    console.error('KIE video error:', err)
    return NextResponse.json({ error: 'Error al iniciar la generación de video' }, { status: 500 })
  }
}
