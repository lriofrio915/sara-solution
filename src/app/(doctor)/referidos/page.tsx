import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import ReferidosClient from './ReferidosClient'

export const metadata: Metadata = { title: 'Referidos — Sara Medical' }
export const dynamic = 'force-dynamic'

export default async function ReferidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: {
      id: true,
      name: true,
      referralCode: true,
      freeMonthsBalance: true,
      plan: true,
      givenReferrals: {
        orderBy: { createdAt: 'desc' },
        include: {
          referred: {
            select: {
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

  if (!doctor) redirect('/login')

  const total = doctor.givenReferrals.length
  const rewarded = doctor.givenReferrals.filter(r => r.status === 'REWARDED').length
  const pending = total - rewarded

  const referrals = doctor.givenReferrals.map(r => ({
    id: r.id,
    status: r.status,
    rewardedAt: r.rewardedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    referredName: maskName(r.referred.name),
    referredSpecialty: r.referred.specialty,
    referredPlan: r.referred.plan,
    referredCreatedAt: r.referred.createdAt.toISOString(),
  }))

  return (
    <ReferidosClient
      referralCode={doctor.referralCode}
      freeMonthsBalance={doctor.freeMonthsBalance}
      doctorName={doctor.name}
      stats={{ total, rewarded, pending }}
      referrals={referrals}
    />
  )
}

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[1][0]}.`
}
