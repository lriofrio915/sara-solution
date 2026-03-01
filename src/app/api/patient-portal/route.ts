import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Find patient(s) with this email
    const patients = await prisma.patient.findMany({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      include: {
        doctor: {
          select: {
            name: true,
            specialty: true,
            avatarUrl: true,
            whatsapp: true,
            phone: true,
            schedules: true,
            address: true,
          },
        },
        appointments: {
          where: {
            date: { gte: new Date() },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
          orderBy: { date: 'asc' },
          take: 10,
          select: {
            id: true,
            date: true,
            type: true,
            status: true,
            reason: true,
            duration: true,
            location: true,
          },
        },
      },
    })

    if (patients.length === 0) {
      return NextResponse.json({ found: false })
    }

    const data = patients.map((p) => ({
      patientName: p.name,
      doctor: p.doctor,
      appointments: p.appointments,
    }))

    return NextResponse.json({ found: true, data })
  } catch (err) {
    console.error('POST /api/patient-portal:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
