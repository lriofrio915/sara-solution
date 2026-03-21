import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const referral = await prisma.referral.findUnique({
    where: { id: params.id },
    include: {
      referrer: { select: { id: true, name: true, freeMonthsBalance: true } },
      referred: { select: { id: true, name: true, freeMonthsBalance: true } },
    },
  })

  if (!referral) return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
  if (referral.status === 'REWARDED') {
    return NextResponse.json({ error: 'Este referido ya fue recompensado' }, { status: 409 })
  }

  // Transacción: marcar como recompensado + acreditar 1 mes gratis a ambos
  await prisma.$transaction([
    prisma.referral.update({
      where: { id: params.id },
      data: { status: 'REWARDED', rewardedAt: new Date() },
    }),
    prisma.doctor.update({
      where: { id: referral.referrerId },
      data: { freeMonthsBalance: { increment: 1 } },
    }),
    prisma.doctor.update({
      where: { id: referral.referredId },
      data: { freeMonthsBalance: { increment: 1 } },
    }),
  ])

  return NextResponse.json({
    success: true,
    message: `1 mes acreditado a ${referral.referrer.name} y ${referral.referred.name}`,
  })
}
