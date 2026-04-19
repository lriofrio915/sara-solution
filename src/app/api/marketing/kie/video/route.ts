import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createVideoTask, createVideoFromImageTask, uploadImageToKie, SARA_CREDIT_COSTS } from '@/lib/kie-ai'

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
  const { prompt, socialPostId, imageBase64 } = await req.json()
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
    let taskId: string
    let description: string

    if (imageBase64) {
      const imageUrl = await uploadImageToKie(imageBase64, 'video-frame.jpg')
      const result = await createVideoFromImageTask(imageUrl, prompt)
      taskId = result.taskId
      description = 'Video IA generado (Grok Imagine I2V 6s)'
    } else {
      const result = await createVideoTask(prompt)
      taskId = result.taskId
      description = 'Video IA generado (Grok Imagine T2V 6s)'
    }

    if (!isAdmin) {
      await prisma.doctorCredit.update({
        where: { doctorId: doctor.id },
        data: { credits: { decrement: cost } },
      })
      await prisma.creditTransaction.create({
        data: {
          doctorId: doctor.id,
          type: 'VIDEO',
          credits: -cost,
          description,
          kieTaskId: taskId,
        },
      })
    }

    void socialPostId

    return NextResponse.json({ taskId, creditCost: cost, newCredits: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('KIE video error:', message)
    return NextResponse.json({ error: `Error al iniciar la generación de video: ${message}` }, { status: 500 })
  }
}
