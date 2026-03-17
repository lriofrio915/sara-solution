import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Returns the authenticated patient's full profile + doctor info */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const patient = await prisma.patient.findFirst({
      where: { authId: user.id },
      include: {
        doctor: { select: { name: true, specialty: true, phone: true, avatarUrl: true } },
      },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    return NextResponse.json(patient)
  } catch (err) {
    console.error('GET /api/patient/me:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** Patient can update their own phone */
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const patient = await prisma.patient.findFirst({ where: { authId: user.id }, select: { id: true } })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const { phone } = await req.json()
    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: { ...(phone !== undefined && { phone: phone || null }) },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/patient/me:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const patient = await prisma.patient.findFirst({
      where: { authId: user.id },
      select: { id: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    // Remove authId so doctor still has the medical record
    await prisma.patient.update({ where: { id: patient.id }, data: { authId: null } })

    // Delete the Supabase auth account
    const admin = createAdminClient()
    await admin.auth.admin.deleteUser(user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/patient/me:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
