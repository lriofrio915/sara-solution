import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: {
        id: true,
        name: true,
        specialty: true,
        email: true,
        phone: true,
        bio: true,
        avatarUrl: true,
        address: true,
        whatsapp: true,
        schedules: true,
      },
    })

    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    return NextResponse.json(doctor)
  } catch (err) {
    console.error('GET /api/profile:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, specialty, phone, bio, avatarUrl, address, whatsapp, schedules } = body

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
    })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const updated = await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(specialty !== undefined && { specialty: String(specialty).trim() }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
        ...(address !== undefined && { address: address || null }),
        ...(whatsapp !== undefined && { whatsapp: whatsapp || null }),
        ...(schedules !== undefined && { schedules: schedules || null }),
      },
      select: {
        id: true,
        name: true,
        specialty: true,
        email: true,
        phone: true,
        bio: true,
        avatarUrl: true,
        address: true,
        whatsapp: true,
        schedules: true,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/profile:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
