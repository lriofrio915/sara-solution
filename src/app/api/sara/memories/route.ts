/**
 * GET  /api/sara/memories  — list all memories for the authenticated doctor
 * DELETE /api/sara/memories?id=xxx — delete a specific memory
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDoctorByAuthId } from '@/lib/queries'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorByAuthId(user.id, user.email ?? undefined)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const memories = await prisma.saraMemory.findMany({
      where: { doctorId: doctor.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, category: true, content: true, createdAt: true },
    })

    return NextResponse.json({ memories })
  } catch (err) {
    console.error('GET /api/sara/memories:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorByAuthId(user.id, user.email ?? undefined)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const memory = await prisma.saraMemory.findFirst({ where: { id, doctorId: doctor.id } })
    if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 })

    await prisma.saraMemory.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/sara/memories:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
