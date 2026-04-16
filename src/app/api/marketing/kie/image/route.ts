import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createImageTask, SARA_CREDIT_COSTS } from '@/lib/kie-ai'

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

  const { prompt, aspectRatio = '1:1', socialPostId } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })

  // Check balance
  const credit = await prisma.doctorCredit.upsert({
    where: { doctorId: doctor.id },
    update: {},
    create: { doctorId: doctor.id, credits: 0 },
  })

  const cost = SARA_CREDIT_COSTS.IMAGE
  if (credit.credits < cost) {
    return NextResponse.json({ error: 'Créditos insuficientes', code: 'INSUFFICIENT_CREDITS' }, { status: 402 })
  }

  try {
    const { taskId } = await createImageTask(prompt, aspectRatio)

    // Deduct credits atomically
    const updated = await prisma.doctorCredit.update({
      where: { doctorId: doctor.id },
      data: { credits: { decrement: cost } },
    })

    await prisma.creditTransaction.create({
      data: {
        doctorId: doctor.id,
        type: 'IMAGE',
        credits: -cost,
        description: `Imagen IA generada (Flux-2 Pro)`,
        kieTaskId: taskId,
      },
    })

    // Optionally link to social post
    if (socialPostId) {
      await prisma.socialPost.update({
        where: { id: socialPostId },
        data: { imageUrl: null }, // will be updated when task completes
      }).catch(() => {}) // ignore if post not found
    }

    return NextResponse.json({ taskId, creditCost: cost, newCredits: updated.credits })
  } catch (err) {
    console.error('KIE image error:', err)
    return NextResponse.json({ error: 'Error al iniciar la generación de imagen' }, { status: 500 })
  }
}
