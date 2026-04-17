import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Superadmin: return real kie.ai pool balance
  if (user.email === SUPERADMIN_EMAIL) {
    const apiKey = process.env.KIE_AI_API_KEY
    if (!apiKey) return NextResponse.json({ credits: 0, transactions: [] })
    try {
      const res = await fetch('https://api.kie.ai/api/v1/chat/credit', {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      })
      const data = await res.json()
      const balance = (data?.code === 200 && typeof data?.data === 'number') ? data.data : 0
      return NextResponse.json({ credits: balance, transactions: [] })
    } catch {
      return NextResponse.json({ credits: 0, transactions: [] })
    }
  }

  // Regular doctor: read from DB
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

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
