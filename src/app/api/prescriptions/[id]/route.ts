import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

async function getDoctor(user: { id: string; email?: string | null }) {
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true, specialty: true, email: true, phone: true, address: true, avatarUrl: true, slug: true, whatsapp: true, mspCode: true, specialtyRegCode: true, establishmentName: true, establishmentCode: true, establishmentRuc: true, province: true, canton: true },
  })
}

// GET /api/prescriptions/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const prescription = await prisma.prescription.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      include: {
        patient: { select: { id: true, name: true, documentId: true, birthDate: true, phone: true, allergies: true } },
      },
    })
    if (!prescription) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ prescription, doctor })
  } catch (err) {
    console.error('GET /api/prescriptions/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/prescriptions/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const existing = await prisma.prescription.findFirst({ where: { id: params.id, doctorId: doctor.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const { medications, instructions, diagnosis, date } = body

    const updated = await prisma.prescription.update({
      where: { id: params.id },
      data: {
        ...(medications !== undefined && { medications }),
        ...(instructions !== undefined && { instructions }),
        ...(diagnosis !== undefined && { diagnosis }),
        ...(date !== undefined && { date: new Date(date) }),
      },
      include: { patient: { select: { id: true, name: true, documentId: true, birthDate: true } } },
    })

    return NextResponse.json({ prescription: updated })
  } catch (err) {
    console.error('PATCH /api/prescriptions/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/prescriptions/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const existing = await prisma.prescription.findFirst({ where: { id: params.id, doctorId: doctor.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.prescription.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/prescriptions/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
