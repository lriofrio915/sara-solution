/**
 * GET  /api/assistant/profile  — perfil propio de la asistente
 * PATCH /api/assistant/profile  — actualizar nombre, teléfono, avatarUrl
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await prisma.doctorMember.findFirst({
      where: { authId: user.id, active: true },
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

    const member = await prisma.doctorMember.findFirst({
      where: { authId: user.id, active: true },
      select: { id: true },
    })
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
