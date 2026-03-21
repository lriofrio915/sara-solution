/**
 * GET  /api/sara/unanswered  — list unanswered questions for the authenticated doctor
 * DELETE /api/sara/unanswered?id=xxx — delete one
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return prisma.doctor.findFirst({ where: { OR: [{ id: user.id }, { email: user.email! }] }, select: { id: true } })
}

export async function GET() {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const questions = await prisma.saraUnansweredQuestion.findMany({
    where: { doctorId: doctor.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ questions })
}

export async function DELETE(req: NextRequest) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.saraUnansweredQuestion.deleteMany({ where: { id, doctorId: doctor.id } })
  return NextResponse.json({ ok: true })
}
