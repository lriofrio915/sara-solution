/**
 * POST /api/public/[slug]/book
 *
 * Creates an appointment from the public booking page.
 * No auth required — patient books as guest.
 *
 * Body: { date: "YYYY-MM-DD", time: "HH:MM", name: string, phone: string, reason?: string }
 *
 * Creates a Patient record if none exists with that phone+doctorId.
 * Creates an Appointment with status SCHEDULED.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: { slug: string } }

const BookSchema = z.object({
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time:   z.string().regex(/^\d{2}:\d{2}$/),
  name:   z.string().min(2).max(100),
  phone:  z.string().min(7).max(20),
  reason: z.string().max(300).optional(),
})

export async function POST(req: NextRequest, { params }: Params) {
  const doctor = await prisma.doctor.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, appointmentDuration: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const { date, time, name, phone, reason } = parsed.data
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute]     = time.split(':').map(Number)

  // Convert ECT (UTC-5) to UTC for storage
  const appointmentUtc = new Date(Date.UTC(year, month - 1, day, hour + 5, minute, 0))

  // Verify slot is not already taken
  const duration = doctor.appointmentDuration ?? 30
  const slotEnd  = new Date(appointmentUtc.getTime() + duration * 60_000)

  const conflict = await prisma.appointment.findFirst({
    where: {
      doctorId: doctor.id,
      status: { notIn: ['CANCELLED'] },
      date: { gte: appointmentUtc, lt: slotEnd },
    },
  })
  if (conflict) {
    return NextResponse.json({ error: 'Este horario ya está reservado. Elige otro.' }, { status: 409 })
  }

  // Find or create patient by phone + doctorId
  let patient = await prisma.patient.findFirst({
    where: { doctorId: doctor.id, phone },
    select: { id: true },
  })

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        doctorId: doctor.id,
        name,
        phone,
      },
      select: { id: true },
    })
  }

  const appointment = await prisma.appointment.create({
    data: {
      doctorId:  doctor.id,
      patientId: patient.id,
      date:      appointmentUtc,
      duration,
      status:    'SCHEDULED',
      type:      'IN_PERSON',
      reason:    reason ?? null,
    },
    select: { id: true, date: true },
  })

  return NextResponse.json({
    ok: true,
    appointmentId: appointment.id,
    date: appointment.date,
    doctor: doctor.name,
  })
}
