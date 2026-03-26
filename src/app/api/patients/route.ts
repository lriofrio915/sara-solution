import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { auditPatient, getClientIp } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// GET /api/patients?q=&page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1'))
    const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get('limit') ?? '20'))
    const skip = (page - 1) * limit

    const where = {
      doctorId: doctor.id,
      deletedAt: null,  // Excluir pacientes con soft delete (LOPDP B6)
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
              { phone: { contains: q } },
              { documentId: { contains: q } },
            ],
          }
        : {}),
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          birthDate: true,
          bloodType: true,
          documentId: true,
          createdAt: true,
          _count: { select: { appointments: true } },
        },
      }),
      prisma.patient.count({ where }),
    ])

    return NextResponse.json({ patients, total, page, limit })
  } catch (err) {
    console.error('GET /api/patients:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/patients — create patient
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const body = await req.json()
    const { name, email, phone, birthDate, documentId, documentType, bloodType, allergies, notes } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre del paciente es requerido' }, { status: 400 })
    }

    // Duplicate detection
    const dupConditions: object[] = []
    if (documentId?.trim()) {
      dupConditions.push({ documentId: documentId.trim() })
    }
    if (phone?.trim() && name?.trim()) {
      dupConditions.push({
        phone: phone.trim(),
        name: { equals: String(name).trim(), mode: 'insensitive' as const },
      })
    }

    if (dupConditions.length > 0) {
      const duplicate = await prisma.patient.findFirst({
        where: { doctorId: doctor.id, OR: dupConditions },
        select: { id: true, name: true },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: `Ya existe un paciente con esos datos: ${duplicate.name}`, existingId: duplicate.id },
          { status: 409 }
        )
      }
    }

    const patient = await prisma.patient.create({
      data: {
        doctorId: doctor.id,
        name: String(name).trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        documentId: documentId?.trim() || null,
        documentType: documentType?.trim() || null,
        bloodType: bloodType || 'UNKNOWN',
        allergies: Array.isArray(allergies) ? allergies : [],
        notes: notes?.trim() || null,
        // retainUntil se calcula al registrar la primera atención (15 años desde última)
      },
    })

    await auditPatient(doctor.id, patient.id, 'CREATE', {
      ip: getClientIp(req),
      patientName: patient.name,
    })

    return NextResponse.json({ patient }, { status: 201 })
  } catch (err) {
    console.error('POST /api/patients:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
