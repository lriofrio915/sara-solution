import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

async function getDoctor(user: { id: string; email?: string | null }) {
  return getDoctorFromUser(user)
}

// GET /api/patients/[id]
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const [patientCore, appointments, medicalRecords] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: params.id, doctorId: doctor.id },
        select: {
          id: true, name: true, email: true, phone: true,
          birthDate: true, bloodType: true, documentId: true,
          documentType: true, allergies: true, notes: true,
          authId: true, createdAt: true,
        },
      }),
      prisma.appointment.findMany({
        where: { patientId: params.id, doctorId: doctor.id },
        orderBy: { date: 'desc' },
        take: 10,
        select: { id: true, date: true, reason: true, status: true, type: true },
      }),
      prisma.medicalRecord.findMany({
        where: { patientId: params.id, doctorId: doctor.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, diagnosis: true, treatment: true, createdAt: true },
      }),
    ])

    if (!patientCore) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const patient = { ...patientCore, appointments, medicalRecords }
    return NextResponse.json(
      { patient },
      { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' } },
    )
  } catch (err) {
    console.error('GET /api/patients/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/patients/[id]
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
