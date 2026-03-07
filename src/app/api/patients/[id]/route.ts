import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getDoctor(user: { id: string; email?: string | null }) {
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
}

// GET /api/patients/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      include: {
        appointments: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        medicalRecords: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    return NextResponse.json({ patient })
  } catch (err) {
    console.error('GET /api/patients/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/patients/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const existing = await prisma.patient.findFirst({ where: { id: params.id, doctorId: doctor.id } })
    if (!existing) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const body = await req.json()
    const { name, email, phone, birthDate, documentId, documentType, bloodType, allergies, notes } = body

    const patient = await prisma.patient.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(documentId !== undefined && { documentId: documentId?.trim() || null }),
        ...(documentType !== undefined && { documentType: documentType?.trim() || null }),
        ...(bloodType !== undefined && { bloodType }),
        ...(allergies !== undefined && { allergies: Array.isArray(allergies) ? allergies : [] }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    })

    return NextResponse.json({ patient })
  } catch (err) {
    console.error('PATCH /api/patients/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/patients/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const existing = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      select: { id: true, _count: { select: { appointments: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    // Delete all related records first, then the patient
    await prisma.$transaction([
      prisma.appointment.deleteMany({ where: { patientId: params.id } }),
      prisma.medicalRecord.deleteMany({ where: { patientId: params.id } }),
      prisma.prescription.deleteMany({ where: { patientId: params.id } }),
      prisma.patient.delete({ where: { id: params.id } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/patients/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
