import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/[slug]/slots?date=YYYY-MM-DD
// Returns available appointment slots for a doctor on a specific date
export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const dateParam = req.nextUrl.searchParams.get('date')
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json({ error: 'date requerido (YYYY-MM-DD)' }, { status: 400 })
    }

    const doctor = await prisma.doctor.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        appointmentDuration: true,
        active: true,
        availabilitySchedules: true,
      },
    })

    if (!doctor || !doctor.active) {
      return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
    }

    // Parse the requested date (local Ecuador time, UTC-5)
    const [year, month, day] = dateParam.split('-').map(Number)
    const requestedDate = new Date(year, month - 1, day)
    const weekday = requestedDate.getDay() // 0=Sun, 1=Mon, ...

    // Don't allow dates in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (requestedDate < today) {
      return NextResponse.json({ slots: [], message: 'No se pueden agendar citas en fechas pasadas' })
    }

    // Find the availability schedule for this weekday
    const schedule = doctor.availabilitySchedules.find(
      (s) => s.weekday === weekday && s.isActive
    )

    if (!schedule) {
      return NextResponse.json({
        slots: [],
        message: 'El médico no tiene atención disponible ese día',
      })
    }

    // Generate all possible slots
    const duration = doctor.appointmentDuration // minutes
    const allSlots = generateSlots(schedule.startTime, schedule.endTime, duration)

    // Get already booked appointments for that day (UTC range covering the full local day)
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 5, 0, 0)) // Ecuador UTC-5
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const booked = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        date: { gte: startOfDay, lt: endOfDay },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { date: true },
    })

    // Convert booked times to "HH:MM" strings (Ecuador UTC-5)
    const bookedTimes = new Set(
      booked.map((a) => {
        const d = new Date(a.date.getTime() - 5 * 60 * 60 * 1000) // UTC-5
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
      })
    )

    const availableSlots = allSlots.filter((slot) => !bookedTimes.has(slot))

    return NextResponse.json({
      date: dateParam,
      weekday,
      duration,
      slots: availableSlots,
      totalAvailable: availableSlots.length,
    })
  } catch (err) {
    console.error('GET /api/[slug]/slots:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Generate time slots between startTime and endTime with the given duration in minutes
function generateSlots(startTime: string, endTime: string, duration: number): string[] {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const startTotal = startH * 60 + startM
  const endTotal = endH * 60 + endM

  const slots: string[] = []
  for (let t = startTotal; t + duration <= endTotal; t += duration) {
    const h = Math.floor(t / 60)
    const m = t % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
}
