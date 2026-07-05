import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isSuperAdminEmail } from '@/lib/superadmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isSuperAdminEmail(user.email)) {
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
