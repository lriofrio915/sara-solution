import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getDoctor(user: { id: string; email?: string | null }) {
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
}

// PATCH /api/appointments/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const body = await req.json()
    const { status, date } = body

    const validStatuses = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    if (date && isNaN(new Date(date).getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: params.id, doctorId: doctor.id },
    })
    if (!appointment) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (date) { updateData.date = new Date(date); updateData.status = 'SCHEDULED' }

    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ appointment: updated })
  } catch (err) {
    console.error('PATCH /api/appointments/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/appointments/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const appointment = await prisma.appointment.findFirst({
      where: { id: params.id, doctorId: doctor.id },
    })
    if (!appointment) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

    await prisma.appointment.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/appointments/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
