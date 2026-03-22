import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { validateCedula } from '@/lib/cedula-ec'

export const dynamic = 'force-dynamic'

async function getDoctor(user: { id: string; email?: string | null }) {
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
}

// GET /api/cedula-lookup?id=0912345678
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const id = req.nextUrl.searchParams.get('id')?.trim() ?? ''
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // 1. Validate cédula algorithm
    const validation = validateCedula(id)
    if (!validation.valid) {
      return NextResponse.json({ valid: false, error: validation.error })
    }

    // 2. Search in doctor's own patient database
    const existingPatient = await prisma.patient.findFirst({
      where: {
        doctorId: doctor.id,
        documentId: id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        bloodType: true,
        allergies: true,
        documentId: true,
        documentType: true,
        notes: true,
        chart: {
          select: {
            occupation: true,
            address: true,
            province: true,
            city: true,
            insurance: true,
          },
        },
      },
    })

    if (existingPatient) {
      return NextResponse.json({
        valid: true,
        found: true,
        source: 'sistema',
        provincia: validation.provincia,
        patient: existingPatient,
      })
    }

    // 3. Not found in local DB — return validation result only
    return NextResponse.json({
      valid: true,
      found: false,
      source: null,
      provincia: validation.provincia,
      provinciaCodigo: validation.provinciaCodigo,
      tipo: validation.type,
    })
  } catch (err) {
    console.error('GET /api/cedula-lookup:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
