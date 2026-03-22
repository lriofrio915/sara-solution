/**
 * PATCH /api/team/members/[id]  — toggle active status
 * DELETE /api/team/members/[id] — remove member
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    if (doctor.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const member = await prisma.doctorMember.findFirst({
      where: { id: params.id, doctorId: doctor.id },
    })
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    const body = await req.json()
    const updated = await prisma.doctorMember.update({
      where: { id: params.id },
      data: {
        ...(body.active !== undefined && { active: body.active }),
        ...(body.canSign !== undefined && { canSign: body.canSign }),
        // Legacy: toggle active if neither field is specified
        ...(body.active === undefined && body.canSign === undefined && { active: !member.active }),
      },
      select: { id: true, name: true, email: true, role: true, active: true, canSign: true },
    })

    return NextResponse.json({ member: updated })
  } catch (err) {
    console.error('PATCH /api/team/members/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    if (doctor.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const member = await prisma.doctorMember.findFirst({
      where: { id: params.id, doctorId: doctor.id },
    })
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Delete Supabase auth user
    const admin = createAdminClient()
    await admin.auth.admin.deleteUser(member.authId)

    // Delete DoctorMember record
    await prisma.doctorMember.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/team/members/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
