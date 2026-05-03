import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

// GET /api/patients/[id]/ficha-data
// Returns patient core fields + patientChart in a single auth round-trip.
// Used by the Ficha Médica client page to avoid two parallel API calls
// each paying their own auth + doctor-lookup overhead.
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const [patient, chart] = await Promise.all([
      prisma.patient.findFirst({
        where: { id, doctorId: doctor.id },
        select: {
          id: true, name: true, email: true, phone: true,
          birthDate: true, bloodType: true, documentId: true,
          documentType: true, allergies: true, notes: true,
        },
      }),
      prisma.patientChart.findUnique({ where: { patientId: id } }),
    ])

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    return NextResponse.json(
      { patient, chart },
      { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' } },
    )
  } catch (err) {
    console.error('GET /api/patients/[id]/ficha-data:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
