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

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalDoctors,
    planCounts,
    totalPatients,
    totalAppointments,
    appointmentsThisMonth,
    newDoctorsLast30d,
    recentDoctors,
    expiringTrials,
    leadSourceCounts,
    totalLeads,
  ] = await Promise.all([
    prisma.doctor.count(),

    prisma.doctor.groupBy({
      by: ['plan'],
      _count: { id: true },
    }),

    prisma.patient.count(),

    prisma.appointment.count(),

    prisma.appointment.count({
      where: { createdAt: { gte: startOfMonth } },
    }),

    prisma.doctor.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),

    prisma.doctor.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        specialty: true,
        plan: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { patients: true } },
      },
    }),

    prisma.doctor.findMany({
      where: {
        plan: 'TRIAL',
        trialEndsAt: { gte: now, lte: sevenDaysFromNow },
      },
      orderBy: { trialEndsAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        specialty: true,
        trialEndsAt: true,
        _count: { select: { patients: true } },
      },
    }),

    prisma.lead.groupBy({
      by: ['source'],
      _count: { id: true },
    }),

    prisma.lead.count(),
  ])

  // Build plan breakdown map
  const planMap: Record<string, number> = { FREE: 0, TRIAL: 0, PRO_MENSUAL: 0, PRO_ANUAL: 0, ENTERPRISE: 0 }
  for (const row of planCounts) {
    const key = row.plan ?? 'FREE'
    planMap[key] = (planMap[key] ?? 0) + row._count.id
  }

  const leadsBySource: Record<string, number> = {}
  for (const row of leadSourceCounts) {
    leadsBySource[row.source] = row._count.id
  }

  return NextResponse.json({
    totalDoctors,
    totalPatients,
    totalAppointments,
    appointmentsThisMonth,
    newDoctorsLast30d,
    planBreakdown: planMap,
    recentDoctors,
    expiringTrials,
    leadsBySource,
    totalLeads,
  })
}
