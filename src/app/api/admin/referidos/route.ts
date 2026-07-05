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

  const referrals = await prisma.referral.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      referrer: { select: { id: true, name: true, email: true, plan: true } },
      referred: { select: { id: true, name: true, email: true, plan: true } },
    },
  })

  return NextResponse.json(referrals)
}
