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

// GET /api/patients/[id]/atenciones/[aid]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; aid: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const attention = await prisma.attention.findFirst({
      where: { id: params.aid, patientId: params.id, doctorId: doctor.id },
    })
    if (!attention) return NextResponse.json({ error: 'Attention not found' }, { status: 404 })

    return NextResponse.json({ attention })
  } catch (err) {
    console.error('GET /api/patients/[id]/atenciones/[aid]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/patients/[id]/atenciones/[aid]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; aid: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const existing = await prisma.attention.findFirst({
      where: { id: params.aid, patientId: params.id, doctorId: doctor.id },
    })
    if (!existing) return NextResponse.json({ error: 'Attention not found' }, { status: 404 })

    const body = await req.json()
    const {
      establishment, service, attentionType, insurance,
      datetime, nextAppointment, durationMins,
      motive, evolution,
      exploration, diagnoses, prescriptionData, exams, images, billing,
    } = body

    const attention = await prisma.attention.update({
      where: { id: params.aid },
      data: {
        ...(establishment !== undefined && { establishment: establishment || null }),
        ...(service !== undefined && { service: service || null }),
        ...(attentionType !== undefined && { attentionType: attentionType || null }),
        ...(insurance !== undefined && { insurance: insurance || null }),
        ...(datetime !== undefined && { datetime: new Date(datetime) }),
        ...(nextAppointment !== undefined && { nextAppointment: nextAppointment ? new Date(nextAppointment) : null }),
        ...(durationMins !== undefined && { durationMins: durationMins !== null ? Number(durationMins) : null }),
        ...(motive !== undefined && { motive: motive || null }),
        ...(evolution !== undefined && { evolution: evolution || null }),
        ...(exploration !== undefined && { exploration }),
        ...(diagnoses !== undefined && { diagnoses }),
        ...(prescriptionData !== undefined && { prescriptionData }),
        ...(exams !== undefined && { exams }),
        ...(images !== undefined && { images }),
        ...(billing !== undefined && { billing }),
      },
    })

    return NextResponse.json({ attention })
  } catch (err) {
    console.error('PATCH /api/patients/[id]/atenciones/[aid]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/patients/[id]/atenciones/[aid]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; aid: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const existing = await prisma.attention.findFirst({
      where: { id: params.aid, patientId: params.id, doctorId: doctor.id },
    })
    if (!existing) return NextResponse.json({ error: 'Attention not found' }, { status: 404 })

    await prisma.attention.delete({ where: { id: params.aid } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/patients/[id]/atenciones/[aid]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
