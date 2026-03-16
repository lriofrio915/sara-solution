import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      specialty: true,
      email: true,
      plan: true,
      avatarUrl: true,
      createdAt: true,
      _count: { select: { patients: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(doctors)
}
