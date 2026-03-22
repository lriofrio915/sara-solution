import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

// GET /api/appointments?filter=today|week|month|all
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const filter = req.nextUrl.searchParams.get('filter') ?? 'all'
    const startDate = req.nextUrl.searchParams.get('startDate')
    const endDate = req.nextUrl.searchParams.get('endDate')
    // Use Ecuador time (UTC-5) for all date boundaries
    const EC_OFFSET_MS = 5 * 60 * 60 * 1000
    const nowUtc = Date.now()
    const nowEc = new Date(nowUtc - EC_OFFSET_MS) // current moment in EC local time

    // Midnight of today in Ecuador = UTC + 5h
    const todayEcMidnight = new Date(
      Date.UTC(nowEc.getUTCFullYear(), nowEc.getUTCMonth(), nowEc.getUTCDate()) + EC_OFFSET_MS
    )

    let dateFilter: { gte?: Date; lt?: Date } = {}

    if (startDate && endDate) {
      dateFilter = { gte: new Date(startDate), lt: new Date(endDate) }
    } else if (filter === 'today') {
      dateFilter = { gte: todayEcMidnight, lt: new Date(todayEcMidnight.getTime() + 86_400_000) }
    } else if (filter === 'week') {
      const weekStart = new Date(todayEcMidnight.getTime() - nowEc.getUTCDay() * 86_400_000)
      dateFilter = { gte: weekStart, lt: new Date(weekStart.getTime() + 7 * 86_400_000) }
    } else if (filter === 'month') {
      const monthStart = new Date(Date.UTC(nowEc.getUTCFullYear(), nowEc.getUTCMonth(), 1) + EC_OFFSET_MS)
      const monthEnd   = new Date(Date.UTC(nowEc.getUTCFullYear(), nowEc.getUTCMonth() + 1, 1) + EC_OFFSET_MS)
      dateFilter = { gte: monthStart, lt: monthEnd }
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { date: 'asc' },
      take: 100,
    })

    return NextResponse.json({ appointments })
  } catch (err) {
    console.error('GET /api/appointments:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/appointments
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const body = await req.json()
    const { patientId, date, duration, type, reason, notes } = body

    if (!patientId) return NextResponse.json({ error: 'Paciente requerido' }, { status: 400 })
    if (!date) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })

    // Check conflict
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        date: new Date(date),
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    })
    if (conflict) {
      return NextResponse.json({ error: 'Ya existe una cita en ese horario' }, { status: 409 })
    }

    const appointment = await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId,
        date: new Date(date),
        duration: duration || 30,
        type: type || 'IN_PERSON',
        reason: reason || null,
        notes: notes || null,
        status: 'SCHEDULED',
      },
      include: { patient: { select: { name: true } } },
    })

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (err) {
    console.error('POST /api/appointments:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
