import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { auditAttention, getClientIp } from '@/lib/audit'

export const dynamic = 'force-dynamic'

async function getDoctor(user: { id: string; email?: string | null }) {
  return getDoctorFromUser(user)
}

// GET /api/patients/[id]/atenciones
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      select: { id: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const tipo = searchParams.get('tipo')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { patientId: params.id, doctorId: doctor.id }
    if (desde || hasta) {
      where.datetime = {
        ...(desde && { gte: new Date(desde) }),
        ...(hasta && { lte: new Date(hasta + 'T23:59:59') }),
      }
    }
    if (tipo) {
      where.service = tipo
    }

    const [total, atenciones] = await Promise.all([
      prisma.attention.count({ where }),
      prisma.attention.findMany({
        where,
        orderBy: { datetime: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          datetime: true,
          service: true,
          attentionType: true,
          motive: true,
          durationMins: true,
          establishment: true,
        },
      }),
    ])

    return NextResponse.json(
      { atenciones, total, page, limit },
      { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' } },
    )
  } catch (err) {
    console.error('GET /api/patients/[id]/atenciones:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/patients/[id]/atenciones — create new attention
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      select: { id: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const body = await req.json()
    const {
      establishment, service, attentionType, insurance,
      datetime, nextAppointment, durationMins,
      motive, evolution,
      exploration, diagnoses, prescriptionData, exams, images, billing,
    } = body

    const attention = await prisma.attention.create({
      data: {
        patientId: params.id,
        doctorId: doctor.id,
        ...(establishment && { establishment }),
        ...(service && { service }),
        ...(attentionType && { attentionType }),
        ...(insurance && { insurance }),
        datetime: datetime ? new Date(datetime) : new Date(),
        ...(nextAppointment && { nextAppointment: new Date(nextAppointment) }),
        ...(durationMins !== undefined && { durationMins: Number(durationMins) }),
        ...(motive && { motive }),
        ...(evolution && { evolution }),
        ...(exploration !== undefined && { exploration }),
        ...(diagnoses !== undefined && { diagnoses }),
        ...(prescriptionData !== undefined && { prescriptionData }),
        ...(exams !== undefined && { exams }),
        ...(images !== undefined && { images }),
        ...(billing !== undefined && { billing }),
      },
    })

    await auditAttention(doctor.id, params.id, 'CREATE', {
      ip: getClientIp(req),
      attentionId: attention.id,
      service,
      datetime,
    })

    // Sync prescription: create a Prescription record if the attention has prescription items
    if (prescriptionData?.items?.length > 0) {
      try {
        const rxItems = (prescriptionData.items as { medicine: string; presentation?: string; dosis?: string; quantity: string; indications: string }[]).map((item) => ({
          name: item.medicine,
          pharmaceuticalForm: item.presentation ?? '',
          dose: item.dosis ?? '',
          frequency: item.indications ?? '',
          duration: item.quantity ?? '',
          notes: '',
        }))
        const diagText = prescriptionData.diagnosis
          ? String(prescriptionData.diagnosis)
          : Array.isArray(diagnoses)
            ? (diagnoses as { cie10Desc: string; cie10Code: string }[])
                .map((d) => `${d.cie10Desc} (${d.cie10Code})`).join('; ')
            : null
        const updatedDoctor = await prisma.doctor.update({
          where: { id: doctor.id },
          data: { prescriptionCounter: { increment: 1 } },
          select: { prescriptionCounter: true },
        })
        const rxNumber = `N.${String(updatedDoctor.prescriptionCounter).padStart(3, '0')}`
        await prisma.prescription.create({
          data: {
            patientId: params.id,
            doctorId: doctor.id,
            attentionId: attention.id,
            rxNumber,
            date: attention.datetime,
            issuedAt: attention.datetime,
            expiresAt: prescriptionData.validUntil ? new Date(prescriptionData.validUntil as string) : null,
            medications: rxItems,
            instructions: (prescriptionData.notes as string) ?? null,
            diagnosis: diagText,
          },
        })
      } catch (rxErr) {
        console.error('Error creating prescription from attention:', rxErr)
        // Non-blocking: don't fail the attention creation if prescription sync fails
      }
    }

    // Sync exam order: create an ExamOrder record if the attention has exam selections
    const hasExams = exams && Object.values(exams as Record<string, unknown>)
      .some(v => Array.isArray(v) && v.length > 0)
    if (hasExams) {
      try {
        await prisma.examOrder.create({
          data: {
            patientId: params.id,
            doctorId: doctor.id,
            attentionId: attention.id,
            exams: exams as Record<string, string[]>,
            date: attention.datetime,
          },
        })
      } catch (examErr) {
        console.error('Error creating exam order from attention:', examErr)
        // Non-blocking: don't fail attention creation if exam order sync fails
      }
    }

    return NextResponse.json({ attention }, { status: 201 })
  } catch (err) {
    console.error('POST /api/patients/[id]/atenciones:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
