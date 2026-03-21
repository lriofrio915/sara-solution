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

  const referrals = await prisma.referral.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      referrer: { select: { id: true, name: true, email: true, plan: true } },
      referred: { select: { id: true, name: true, email: true, plan: true } },
    },
  })

  return NextResponse.json(referrals)
}
