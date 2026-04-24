/**
 * GET  /api/doctor/patient-leads          — list leads for authenticated doctor
 * POST /api/doctor/patient-leads          — manually create a lead
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { parseBody } from '@/lib/validation/parseBody'
import { PatientLeadCreateSchema } from '@/lib/validation/schemas/lead'

export const dynamic = 'force-dynamic'

async function getDoctorId(userId: string, userEmail: string | null | undefined) {
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: userId }, ...(userEmail ? [{ email: userEmail }] : [])] },
    select: { id: true },
  })
  return doctor?.id ?? null
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctorId = await getDoctorId(user.id, user.email)
    if (!doctorId) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const leads = await prisma.patientLead.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(leads)
  } catch (err) {
    console.error('[patient-leads GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctorId = await getDoctorId(user.id, user.email)
    if (!doctorId) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const parsed = await parseBody(req, PatientLeadCreateSchema)
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    const lead = await prisma.patientLead.create({
      data: {
        doctorId,
        name: body.name,
        phone: body.phone ?? null,
        email: body.email ?? null,
        message: body.message ?? null,
        source: body.source ?? 'OTRO',
        campaign: body.campaign ?? null,
        status: body.status ?? 'NUEVO',
        notes: body.notes ?? null,
      },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (err) {
    console.error('[patient-leads POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
