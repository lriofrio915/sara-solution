import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const patient = await prisma.patient.findUnique({ where: { authId: user.id }, select: { id: true } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const certs = await prisma.medicalCertificate.findMany({
      where: { patientId: patient.id },
      orderBy: { date: 'desc' },
      select: { id: true, date: true, content: true, diagnosis: true, treatment: true, restDays: true },
    })

    return NextResponse.json(certs)
  } catch (err) {
    console.error('GET /api/patient/me/certificates:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
