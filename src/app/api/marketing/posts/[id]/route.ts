import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const post = await prisma.socialPost.findFirst({
    where: { id: params.id, doctorId: doctor.id },
  })
  if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ post })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const existing = await prisma.socialPost.findFirst({
    where: { id: params.id, doctorId: doctor.id },
  })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()
  const {
    content, hashtags, status, scheduledAt,
    contentType, targetPlatform, topic,
    carouselSlides, reelScript, imagePrompt, suggestedTime, imageUrl, videoUrl,
  } = body

  const update: Record<string, unknown> = {}
  if (content !== undefined) update.content = content
  if (hashtags !== undefined) update.hashtags = hashtags
  if (imageUrl !== undefined) update.imageUrl = imageUrl
  if (videoUrl !== undefined) update.videoUrl = videoUrl
  if (status !== undefined) {
    update.status = status
    if (status === 'APPROVED') update.approvedAt = new Date()
    if (status === 'PUBLISHED') update.publishedAt = new Date()
  }
  if (scheduledAt !== undefined) update.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
  if (contentType !== undefined) update.contentType = contentType
  if (targetPlatform !== undefined) update.targetPlatform = targetPlatform
  if (topic !== undefined) update.topic = topic
  if (carouselSlides !== undefined) update.carouselSlides = carouselSlides
  if (reelScript !== undefined) update.reelScript = reelScript
  if (imagePrompt !== undefined) update.imagePrompt = imagePrompt
  if (suggestedTime !== undefined) update.suggestedTime = suggestedTime

  const post = await prisma.socialPost.update({
    where: { id: params.id },
    data: update,
  })

  return NextResponse.json({ post })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const existing = await prisma.socialPost.findFirst({
    where: { id: params.id, doctorId: doctor.id },
  })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.socialPost.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
