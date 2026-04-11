/**
 * GET /api/public/[slug]/availability?date=YYYY-MM-DD
 *
 * Returns available time slots for a doctor on a given date.
 * Public — no auth required.
 *
 * Slot generation:
 *  - Uses doctor.availabilitySchedules for that weekday
 *  - Each slot = doctor.appointmentDuration minutes (default 30)
 *  - Excludes slots already booked (status != CANCELLED)
 *  - Excludes slots in the past
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: { slug: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const dateParam = req.nextUrl.searchParams.get('date')
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 })
  }

  const doctor = await prisma.doctor.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      appointmentDuration: true,
      availabilitySchedules: {
        where: { isActive: true },
        select: { weekday: true, startTime: true, endTime: true, location: true },
      },
    },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  // Parse date in Ecuador timezone (UTC-5)
  const [year, month, day] = dateParam.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const weekday = dateObj.getDay() // 0=Sun…6=Sat

  const schedule = doctor.availabilitySchedules.find((s) => s.weekday === weekday)
  if (!schedule) {
    return NextResponse.json({ slots: [], message: 'No hay atención ese día' })
  }

  const duration = doctor.appointmentDuration ?? 30

  // Build all slots for the day
  function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + (m ?? 0)
  }

  const startMin = timeToMinutes(schedule.startTime)
  const endMin   = timeToMinutes(schedule.endTime)
  const allSlots: string[] = []

  for (let m = startMin; m + duration <= endMin; m += duration) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    allSlots.push(`${hh}:${mm}`)
  }

  // Get booked slots for that day (UTC boundaries — the day in Ecuador = UTC+5)
  const dayStart = new Date(Date.UTC(year, month - 1, day, 5, 0, 0))    // 00:00 ECT = 05:00 UTC
  const dayEnd   = new Date(Date.UTC(year, month - 1, day + 1, 5, 0, 0))

  const booked = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      date: { gte: dayStart, lt: dayEnd },
      status: { notIn: ['CANCELLED'] },
    },
    select: { date: true },
  })

  const bookedTimes = new Set(
    booked.map((a) => {
      const d = new Date(a.date.getTime() - 5 * 60 * 60 * 1000) // UTC → ECT
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
    })
  )

  // Exclude past slots if date is today
  const nowEct = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const isToday =
    nowEct.getUTCFullYear() === year &&
    nowEct.getUTCMonth() + 1 === month &&
    nowEct.getUTCDate() === day
  const nowMinutes = nowEct.getUTCHours() * 60 + nowEct.getUTCMinutes()

  const available = allSlots.filter((slot) => {
    if (bookedTimes.has(slot)) return false
    if (isToday && timeToMinutes(slot) <= nowMinutes) return false
    return true
  })

  return NextResponse.json({
    slots: available,
    duration,
    location: schedule.location ?? null,
  })
}
