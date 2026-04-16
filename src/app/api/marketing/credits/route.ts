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

export async function GET() {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Upsert credit record (create if not exists)
  const credit = await prisma.doctorCredit.upsert({
    where: { doctorId: doctor.id },
    update: {},
    create: { doctorId: doctor.id, credits: 0 },
  })

  const transactions = await prisma.creditTransaction.findMany({
    where: { doctorId: doctor.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return NextResponse.json({ credits: credit.credits, transactions })
}
