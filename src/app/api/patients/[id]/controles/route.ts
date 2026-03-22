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

// GET /api/patients/[id]/controles
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      select: { id: true, birthDate: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const chart = await prisma.patientChart.findUnique({
      where: { patientId: params.id },
      select: { vaccineRecords: true, growthRecords: true, pregnancyData: true },
    })

    return NextResponse.json({
      birthDate: patient.birthDate,
      vaccineRecords: chart?.vaccineRecords ?? [],
      growthRecords: chart?.growthRecords ?? [],
      pregnancyData: chart?.pregnancyData ?? null,
    })
  } catch (err) {
    console.error('GET /api/patients/[id]/controles:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/patients/[id]/controles
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
    const { vaccineRecords, growthRecords, pregnancyData } = body

    const updated = await prisma.patientChart.upsert({
      where: { patientId: params.id },
      create: {
        patientId: params.id,
        doctorId: doctor.id,
        vaccineRecords: vaccineRecords ?? [],
        growthRecords: growthRecords ?? [],
        pregnancyData: pregnancyData ?? null,
      },
      update: {
        ...(vaccineRecords !== undefined && { vaccineRecords }),
        ...(growthRecords !== undefined && { growthRecords }),
        ...(pregnancyData !== undefined && { pregnancyData }),
      },
    })

    return NextResponse.json({ success: true, chart: updated })
  } catch (err) {
    console.error('POST /api/patients/[id]/controles:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
