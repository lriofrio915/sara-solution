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

// GET — lista posts LinkedIn del doctor
export async function GET(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)

  const posts = await prisma.socialPost.findMany({
    where: {
      doctorId: doctor.id,
      targetPlatform: 'LINKEDIN',
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({ posts })
}

// PATCH — actualizar post (contenido, status, imagen, fecha programada)
export async function PATCH(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, content, hashtags, status, imageUrl, scheduledAt } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const existing = await prisma.socialPost.findFirst({
    where: { id, doctorId: doctor.id },
  })
  if (!existing) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })

  const post = await prisma.socialPost.update({
    where: { id },
    data: {
      ...(content !== undefined ? { content } : {}),
      ...(hashtags !== undefined ? { hashtags } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
      ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
    },
  })

  return NextResponse.json({ post })
}

// DELETE — eliminar post
export async function DELETE(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const existing = await prisma.socialPost.findFirst({ where: { id, doctorId: doctor.id } })
  if (!existing) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })

  await prisma.socialPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
