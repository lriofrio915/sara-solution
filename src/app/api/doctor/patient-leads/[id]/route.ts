/**
 * PATCH  /api/doctor/patient-leads/[id]  — update lead
 * DELETE /api/doctor/patient-leads/[id]  — delete lead
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getDoctorId(userId: string, userEmail: string | null | undefined) {
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: userId }, ...(userEmail ? [{ email: userEmail }] : [])] },
    select: { id: true },
  })
  return doctor?.id ?? null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctorId = await getDoctorId(user.id, user.email)
    if (!doctorId) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const lead = await prisma.patientLead.findFirst({
      where: { id: params.id, doctorId },
    })
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const updated = await prisma.patientLead.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.message !== undefined && { message: body.message || null }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.campaign !== undefined && { campaign: body.campaign || null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[patient-leads PATCH]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctorId = await getDoctorId(user.id, user.email)
    if (!doctorId) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const lead = await prisma.patientLead.findFirst({
      where: { id: params.id, doctorId },
    })
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.patientLead.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[patient-leads DELETE]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
