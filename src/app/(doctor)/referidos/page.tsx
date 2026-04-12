import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import ReferidosClient from './ReferidosClient'

export const metadata: Metadata = { title: 'Referidos — Sara Medical' }
export const dynamic = 'force-dynamic'

function generateReferralCode(name: string, id: string): string {
  const namePart = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)[0]
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 5)
  const idPart = id.replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase()
  return `${namePart}${idPart}`
}

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
      rewardPreference: true,
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

  // Generate referral code on-the-fly if the doctor doesn't have one yet
  let referralCode = doctor.referralCode
  if (!referralCode) {
    let candidate = generateReferralCode(doctor.name, doctor.id)
    const collision = await prisma.doctor.findUnique({ where: { referralCode: candidate } })
    if (collision && collision.id !== doctor.id) {
      candidate = `${candidate}${Date.now().toString(36).slice(-3).toUpperCase()}`
    }
    await prisma.doctor.update({ where: { id: doctor.id }, data: { referralCode: candidate } })
    referralCode = candidate
  }

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
      referralCode={referralCode}
      freeMonthsBalance={doctor.freeMonthsBalance}
      rewardPreference={doctor.rewardPreference ?? 'FREE_MONTH'}
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
