import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

async function getDoctor(user: { id: string; email?: string | null }) {
  return getDoctorFromUser(user)
}

// GET /api/patients/[id]/chart
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    // Verify patient belongs to doctor
    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      select: { id: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const chart = await prisma.patientChart.findUnique({
      where: { patientId: params.id },
    })

    return NextResponse.json({ chart })
  } catch (err) {
    console.error('GET /api/patients/[id]/chart:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/patients/[id]/chart — upsert
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    // Verify patient belongs to doctor
    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      select: { id: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const body = await req.json()
    const {
      sex, maritalStatus, education, province, city, category,
      occupation, referredBy, address, admissionDate, insurance, patientStatus,
      alert1, alert2, alert3,
      tutorName, tutorRelation, tutorPhone, tutorEmail,
      heredoFamiliar, personalPathologic, personalNonPathologic,
      gynecoObstetric, dentalHabits, stimulation,
    } = body

    const chartData = {
      doctorId: doctor.id,
      ...(sex !== undefined && { sex: sex || null }),
      ...(maritalStatus !== undefined && { maritalStatus: maritalStatus || null }),
      ...(education !== undefined && { education: education || null }),
      ...(province !== undefined && { province: province || null }),
      ...(city !== undefined && { city: city || null }),
      ...(category !== undefined && { category: category || null }),
      ...(occupation !== undefined && { occupation: occupation || null }),
      ...(referredBy !== undefined && { referredBy: referredBy || null }),
      ...(address !== undefined && { address: address || null }),
      ...(admissionDate !== undefined && { admissionDate: admissionDate ? new Date(admissionDate) : null }),
      ...(insurance !== undefined && { insurance: insurance || null }),
      ...(patientStatus !== undefined && { patientStatus: patientStatus || null }),
      ...(alert1 !== undefined && { alert1: alert1 || null }),
      ...(alert2 !== undefined && { alert2: alert2 || null }),
      ...(alert3 !== undefined && { alert3: alert3 || null }),
      ...(tutorName !== undefined && { tutorName: tutorName || null }),
      ...(tutorRelation !== undefined && { tutorRelation: tutorRelation || null }),
      ...(tutorPhone !== undefined && { tutorPhone: tutorPhone || null }),
      ...(tutorEmail !== undefined && { tutorEmail: tutorEmail || null }),
      ...(heredoFamiliar !== undefined && { heredoFamiliar }),
      ...(personalPathologic !== undefined && { personalPathologic }),
      ...(personalNonPathologic !== undefined && { personalNonPathologic }),
      ...(gynecoObstetric !== undefined && { gynecoObstetric }),
      ...(dentalHabits !== undefined && { dentalHabits }),
      ...(stimulation !== undefined && { stimulation }),
    }

    const chart = await prisma.patientChart.upsert({
      where: { patientId: params.id },
      create: { patientId: params.id, ...chartData },
      update: chartData,
    })

    return NextResponse.json({ chart })
  } catch (err) {
    console.error('POST /api/patients/[id]/chart:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
