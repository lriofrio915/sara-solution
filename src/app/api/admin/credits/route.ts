import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const [pending, allCredits] = await Promise.all([
    prisma.creditRecharge.findMany({
      where: { status: 'PENDING' },
      include: { doctor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.doctorCredit.findMany({
      include: { doctor: { select: { id: true, name: true, email: true } } },
      orderBy: { credits: 'desc' },
    }),
  ])

  return NextResponse.json({ pending, allCredits })
}
