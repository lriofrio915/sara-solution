import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getDoctor(user: { id: string; email?: string | null }) {
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true, specialty: true, email: true, phone: true, address: true },
  })
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const patientId = req.nextUrl.searchParams.get('patientId') ?? undefined
    const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get('limit') ?? '50'))
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1'))

    const where = { doctorId: doctor.id, ...(patientId ? { patientId } : {}) }

    const [orders, total] = await Promise.all([
      prisma.examOrder.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: { patient: { select: { id: true, name: true, documentId: true } } },
      }),
      prisma.examOrder.count({ where }),
    ])

    return NextResponse.json({ orders, total })
  } catch (err) {
    console.error('GET /api/exam-orders:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const body = await req.json()
    const { patientId, appointmentId, exams, otrosExams, notes, date } = body

    if (!patientId) return NextResponse.json({ error: 'Paciente requerido' }, { status: 400 })

    const order = await prisma.examOrder.create({
      data: {
        doctorId: doctor.id,
        patientId,
        appointmentId: appointmentId || null,
        exams: exams || {},
        otrosExams: otrosExams || null,
        notes: notes || null,
        date: date ? new Date(date) : new Date(),
      },
      include: { patient: { select: { id: true, name: true, documentId: true } } },
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    console.error('POST /api/exam-orders:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
