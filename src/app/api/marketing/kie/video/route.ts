import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createVideoTask, createVideoFromImageTask, uploadImageToKie, SARA_CREDIT_COSTS, VideoDurationClips } from '@/lib/kie-ai'

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

const VALID_CLIPS: VideoDurationClips[] = [1, 3, 5, 8]

export async function POST(req: Request) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { doctor, isAdmin } = auth
  const { prompt, socialPostId, imageBase64, clips: rawClips = 1 } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })

  const clips: VideoDurationClips = VALID_CLIPS.includes(rawClips) ? rawClips : 1
  const cost = SARA_CREDIT_COSTS.VIDEO_BY_CLIPS[clips]

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
    let taskIds: string[]
    let description: string

    if (imageBase64) {
      const imageUrl = await uploadImageToKie(imageBase64, 'video-frame.jpg')
      const results = await Promise.all(
        Array.from({ length: clips }, () => createVideoFromImageTask(imageUrl, prompt))
      )
      taskIds = results.map(r => r.taskId)
      description = `Video IA generado (Grok Imagine I2V ${clips * 6}s)`
    } else {
      const results = await Promise.all(
        Array.from({ length: clips }, () => createVideoTask(prompt))
      )
      taskIds = results.map(r => r.taskId)
      description = `Video IA generado (Grok Imagine T2V ${clips * 6}s)`
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
          kieTaskId: taskIds[0],
        },
      })
    }

    void socialPostId

    return NextResponse.json({ taskIds, clipCount: clips, creditCost: cost, newCredits: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('KIE video error:', message)
    return NextResponse.json({ error: `Error al iniciar la generación de video: ${message}` }, { status: 500 })
  }
}
