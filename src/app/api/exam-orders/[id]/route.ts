import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

async function getDoctor(user: { id: string; email?: string | null }) {
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true, specialty: true, email: true, phone: true, address: true },
  })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const order = await prisma.examOrder.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      include: {
        patient: { select: { id: true, name: true, documentId: true, birthDate: true, phone: true } },
      },
    })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ order, doctor })
  } catch (err) {
    console.error('GET /api/exam-orders/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const existing = await prisma.examOrder.findFirst({ where: { id: params.id, doctorId: doctor.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.examOrder.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/exam-orders/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
