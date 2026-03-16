import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/availability — returns doctor's weekly schedule + appointmentDuration
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: {
        id: true,
        appointmentDuration: true,
        availabilitySchedules: {
          orderBy: { weekday: 'asc' },
        },
      },
    })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    return NextResponse.json({
      appointmentDuration: doctor.appointmentDuration,
      schedules: doctor.availabilitySchedules,
    })
  } catch (err) {
    console.error('GET /api/availability:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PUT /api/availability — upserts weekly schedule + appointmentDuration
// Body: { appointmentDuration: number, schedules: { weekday, startTime, endTime, isActive }[] }
export async function PUT(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
    })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const body = await req.json()
    const { appointmentDuration, schedules } = body as {
      appointmentDuration?: number
      schedules?: { weekday: number; startTime: string; endTime: string; isActive: boolean; location?: string }[]
    }

    // Update appointmentDuration
    if (appointmentDuration !== undefined) {
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { appointmentDuration: Number(appointmentDuration) },
      })
    }

    if (schedules && Array.isArray(schedules)) {
      await prisma.availabilitySchedule.deleteMany({ where: { doctorId: doctor.id } })
      if (schedules.length > 0) {
        await prisma.availabilitySchedule.createMany({
          data: schedules.map((s) => ({
            doctorId: doctor.id,
            weekday: s.weekday,
            startTime: s.startTime,
            endTime: s.endTime,
            isActive: s.isActive,
            location: s.location || null,
          })),
        })
      }
    }

    // Return updated data
    const updated = await prisma.doctor.findUnique({
      where: { id: doctor.id },
      select: {
        appointmentDuration: true,
        availabilitySchedules: { orderBy: { weekday: 'asc' } },
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PUT /api/availability:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
