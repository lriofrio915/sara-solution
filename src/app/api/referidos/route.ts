import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: {
      id: true,
      referralCode: true,
      freeMonthsBalance: true,
      givenReferrals: {
        orderBy: { createdAt: 'desc' },
        include: {
          referred: {
            select: {
              id: true,
              name: true,
              specialty: true,
              plan: true,
              createdAt: true,
            },
          },
        },
      },
    },
  })

  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  const total = doctor.givenReferrals.length
  const rewarded = doctor.givenReferrals.filter(r => r.status === 'REWARDED').length
  const pending = total - rewarded

  return NextResponse.json({
    referralCode: doctor.referralCode,
    freeMonthsBalance: doctor.freeMonthsBalance,
    stats: { total, rewarded, pending },
    referrals: doctor.givenReferrals.map(r => ({
      id: r.id,
      status: r.status,
      rewardedAt: r.rewardedAt,
      createdAt: r.createdAt,
      referred: {
        id: r.referred.id,
        // Mostrar solo nombre parcial por privacidad
        name: maskName(r.referred.name),
        specialty: r.referred.specialty,
        plan: r.referred.plan,
        createdAt: r.referred.createdAt,
      },
    })),
  })
}

/** Muestra nombre + inicial del apellido: "Carlos R." */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[1][0]}.`
}
