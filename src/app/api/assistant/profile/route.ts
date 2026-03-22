/**
 * GET  /api/assistant/profile  — perfil propio de la asistente
 * PATCH /api/assistant/profile  — actualizar nombre, teléfono, avatarUrl
 *
 * For multi-doctor assistants, uses the sara-active-doctor-id cookie to find the
 * correct DoctorMember record (name/avatar may differ per practice if set).
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getActiveMember(authId: string) {
  const cookieStore = await cookies()
  const activeDoctorId = cookieStore.get('sara-active-doctor-id')?.value

  // Build where clause: prefer active doctor if cookie present
  const where = activeDoctorId
    ? { authId, doctorId: activeDoctorId, active: true }
    : { authId, active: true }

  return prisma.doctorMember.findFirst({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      canSign: true,
      createdAt: true,
      doctor: {
        select: {
          id: true,
          name: true,
          specialty: true,
          email: true,
          phone: true,
          avatarUrl: true,
          address: true,
          establishmentName: true,
        },
      },
    },
  })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await getActiveMember(user.id)
    if (!member) return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })

    return NextResponse.json({ member })
  } catch (err) {
    console.error('GET /api/assistant/profile:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await getActiveMember(user.id)
    if (!member) return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })

    const body = await req.json()
    const { name, phone, avatarUrl } = body

    const updated = await prisma.doctorMember.update({
      where: { id: member.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        canSign: true,
      },
    })

    return NextResponse.json({ member: updated })
  } catch (err) {
    console.error('PATCH /api/assistant/profile:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
