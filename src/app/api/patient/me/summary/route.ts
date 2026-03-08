import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Returns dashboard summary data for the authenticated patient */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const patient = await prisma.patient.findUnique({
      where: { authId: user.id },
      select: { id: true, name: true, doctorId: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const now = new Date()
    const [upcomingAppointments, recentPrescriptions, totalExamOrders, totalCertificates] =
      await Promise.all([
        prisma.appointment.findMany({
          where: { patientId: patient.id, date: { gte: now }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
          orderBy: { date: 'asc' },
          take: 3,
        }),
        prisma.prescription.findMany({
          where: { patientId: patient.id },
          orderBy: { date: 'desc' },
          take: 3,
          select: { id: true, date: true, diagnosis: true, medications: true },
        }),
        prisma.examOrder.count({ where: { patientId: patient.id } }),
        prisma.medicalCertificate.count({ where: { patientId: patient.id } }),
      ])

    return NextResponse.json({ upcomingAppointments, recentPrescriptions, totalExamOrders, totalCertificates })
  } catch (err) {
    console.error('GET /api/patient/me/summary:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
