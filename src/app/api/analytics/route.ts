import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const last90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Run all queries in parallel
  const [
    totalPatients,
    patientsThisMonth,
    patientsLastMonth,
    totalAppointments,
    apptThisMonth,
    apptLastMonth,
    completedAppt,
    cancelledAppt,
    noShowAppt,
    totalPrescriptions,
    prescThisMonth,
    totalExamOrders,
    totalCertificates,
    attentions,
    recentAttentions,
    appointments6m,
  ] = await Promise.all([
    prisma.patient.count({ where: { doctorId: doctor.id } }),
    prisma.patient.count({ where: { doctorId: doctor.id, createdAt: { gte: startOfMonth } } }),
    prisma.patient.count({ where: { doctorId: doctor.id, createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    prisma.appointment.count({ where: { doctorId: doctor.id } }),
    prisma.appointment.count({ where: { doctorId: doctor.id, date: { gte: startOfMonth } } }),
    prisma.appointment.count({ where: { doctorId: doctor.id, date: { gte: startOfLastMonth, lt: startOfMonth } } }),
    prisma.appointment.count({ where: { doctorId: doctor.id, status: 'COMPLETED' } }),
    prisma.appointment.count({ where: { doctorId: doctor.id, status: 'CANCELLED' } }),
    prisma.appointment.count({ where: { doctorId: doctor.id, status: 'NO_SHOW' } }),
    prisma.prescription.count({ where: { doctorId: doctor.id } }),
    prisma.prescription.count({ where: { doctorId: doctor.id, date: { gte: startOfMonth } } }),
    prisma.examOrder.count({ where: { doctorId: doctor.id } }),
    prisma.medicalCertificate.count({ where: { doctorId: doctor.id } }),
    // Attentions with diagnoses for analysis
    prisma.attention.findMany({
      where: { doctorId: doctor.id, createdAt: { gte: startOfYear } },
      select: { diagnoses: true, prescriptionData: true, datetime: true },
      orderBy: { datetime: 'desc' },
      take: 500,
    }),
    // Recent attentions for last 90 days
    prisma.attention.findMany({
      where: { doctorId: doctor.id, createdAt: { gte: last90 } },
      select: { diagnoses: true, datetime: true },
      take: 200,
    }),
    // Appointments last 6 months for trend
    prisma.appointment.findMany({
      where: { doctorId: doctor.id, date: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { date: true, status: true },
    }),
  ])

  // Process diagnoses frequency
  const diagCount: Record<string, number> = {}
  const diagAll = [...attentions, ...recentAttentions]
  for (const a of diagAll) {
    const diags = (a.diagnoses as { cie10Code?: string; cie10Desc?: string }[] | null) ?? []
    for (const d of diags) {
      if (d.cie10Desc) {
        const key = d.cie10Code ? `${d.cie10Code} - ${d.cie10Desc}` : d.cie10Desc
        diagCount[key] = (diagCount[key] ?? 0) + 1
      }
    }
  }
  const topDiagnoses = Object.entries(diagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  // Process medications frequency
  const medCount: Record<string, number> = {}
  for (const a of attentions) {
    const meds = (a.prescriptionData as { medicine?: string }[] | null) ?? []
    for (const m of meds) {
      if (m.medicine) {
        medCount[m.medicine] = (medCount[m.medicine] ?? 0) + 1
      }
    }
  }
  const topMedications = Object.entries(medCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  // Monthly appointments trend (last 6 months)
  const monthLabels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const monthlyAppts: Record<string, number> = {}
  for (const a of appointments6m) {
    const d = new Date(a.date)
    const key = `${monthLabels[d.getMonth()]} ${d.getFullYear()}`
    monthlyAppts[key] = (monthlyAppts[key] ?? 0) + 1
  }
  const trendData = Object.entries(monthlyAppts)
    .slice(-6)
    .map(([label, value]) => ({ label, value }))

  const completionRate = totalAppointments > 0 ? Math.round((completedAppt / totalAppointments) * 100) : 0
  const cancellationRate = totalAppointments > 0 ? Math.round((cancelledAppt / totalAppointments) * 100) : 0
  const noShowRate = totalAppointments > 0 ? Math.round((noShowAppt / totalAppointments) * 100) : 0

  return NextResponse.json({
    overview: {
      totalPatients, patientsThisMonth, patientsLastMonth,
      totalAppointments, apptThisMonth, apptLastMonth,
      totalPrescriptions, prescThisMonth,
      totalExamOrders, totalCertificates,
      completionRate, cancellationRate, noShowRate,
    },
    topDiagnoses,
    topMedications,
    trendData,
  })
}
