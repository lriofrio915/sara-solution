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

export async function GET(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const contentType = searchParams.get('contentType')
  const targetPlatform = searchParams.get('targetPlatform')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const where = {
    doctorId: doctor.id,
    ...(status ? { status: status as never } : {}),
    ...(contentType ? { contentType: contentType as never } : {}),
    ...(targetPlatform ? { targetPlatform: targetPlatform as never } : {}),
  }

  const [posts, total] = await Promise.all([
    prisma.socialPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.socialPost.count({ where }),
  ])

  return NextResponse.json({ posts, total })
}
