import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/** GET — check if patient already has access */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true },
    })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      select: { id: true, authId: true, email: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    return NextResponse.json({ hasAccess: !!patient.authId, email: patient.email })
  } catch (err) {
    console.error('GET /api/patients/[id]/access:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** POST — create patient auth account */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true },
    })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    if (!patient.email) {
      return NextResponse.json({ error: 'El paciente no tiene un correo electrónico registrado. Agrégalo primero.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // If already has an authId, reset the password instead
    if (patient.authId) {
      const password = generatePassword()
      const { error: resetErr } = await admin.auth.admin.updateUserById(patient.authId, { password })
      if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 400 })
      return NextResponse.json({ email: patient.email, password, reset: true })
    }

    const password = generatePassword()
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: patient.email,
      password,
      email_confirm: true,
      user_metadata: { role: 'patient', patientId: patient.id },
    })

    if (createErr) {
      // If email already exists, link to existing auth user
      if (createErr.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Este correo ya tiene una cuenta. Usa "Resetear contraseña" en su lugar.' }, { status: 409 })
      }
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }

    await prisma.patient.update({
      where: { id: patient.id },
      data: { authId: created.user.id },
    })

    return NextResponse.json({ email: patient.email, password }, { status: 201 })
  } catch (err) {
    console.error('POST /api/patients/[id]/access:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** DELETE — revoke patient access */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true },
    })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      select: { id: true, authId: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    if (!patient.authId) return NextResponse.json({ error: 'Patient has no access' }, { status: 400 })

    const admin = createAdminClient()
    await admin.auth.admin.deleteUser(patient.authId)
    await prisma.patient.update({ where: { id: patient.id }, data: { authId: null } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/patients/[id]/access:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
