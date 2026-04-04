import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

async function getDoctor(user: { id: string; email?: string | null }) {
  return getDoctorFromUser(user)
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

    // Sync prescription: upsert the linked Prescription record if items exist
    if (prescriptionData?.items?.length > 0) {
      try {
        const rxItems = (prescriptionData.items as { medicine: string; dosis?: string; quantity: string; indications: string }[]).map((item) => ({
          name: item.medicine,
          dose: item.dosis ?? '',
          frequency: item.indications ?? '',
          duration: item.quantity ?? '',
          notes: '',
        }))
        const body2 = await prisma.attention.findFirst({
          where: { id: params.aid },
          select: { diagnoses: true, datetime: true },
        })
        const diagText = Array.isArray(body2?.diagnoses)
          ? (body2.diagnoses as { cie10Desc: string; cie10Code: string }[])
              .map((d) => `${d.cie10Desc} (${d.cie10Code})`).join('; ')
          : null

        const existingRx = await prisma.prescription.findFirst({ where: { attentionId: params.aid } })
        if (existingRx) {
          await prisma.prescription.update({
            where: { id: existingRx.id },
            data: {
              medications: rxItems,
              instructions: (prescriptionData.notes as string) ?? null,
              diagnosis: diagText,
              expiresAt: prescriptionData.validUntil ? new Date(prescriptionData.validUntil as string) : null,
            },
          })
        } else {
          const lastRx = await prisma.prescription.findFirst({
            where: { doctorId: doctor.id },
            orderBy: { issuedAt: 'desc' },
            select: { rxNumber: true },
          })
          const nextNum = String((parseInt(lastRx?.rxNumber?.replace(/\D/g, '') ?? '0') || 0) + 1).padStart(3, '0')
          await prisma.prescription.create({
            data: {
              patientId: params.id,
              doctorId: doctor.id,
              attentionId: params.aid,
              rxNumber: `N.${nextNum}`,
              date: body2?.datetime ?? new Date(),
              issuedAt: body2?.datetime ?? new Date(),
              expiresAt: prescriptionData.validUntil ? new Date(prescriptionData.validUntil as string) : null,
              medications: rxItems,
              instructions: (prescriptionData.notes as string) ?? null,
              diagnosis: diagText,
            },
          })
        }
      } catch (rxErr) {
        console.error('Error syncing prescription on attention update:', rxErr)
        // Non-blocking: don't fail the attention update if prescription sync fails
      }
    }

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
