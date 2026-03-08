import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getDoctorId(user: { id: string; email?: string | null }) {
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
  return doctor?.id ?? null
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctorId = await getDoctorId(user)
    if (!doctorId) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const reminder = await prisma.reminder.findFirst({
      where: { id: params.id, doctorId },
    })
    if (!reminder) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const { title, description, dueDate, priority, category, completed } = body

    const updated = await prisma.reminder.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(priority !== undefined && { priority }),
        ...(category !== undefined && { category: category?.trim() || null }),
        ...(completed !== undefined && {
          completed: Boolean(completed),
          completedAt: completed ? new Date() : null,
        }),
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/reminders/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctorId = await getDoctorId(user)
    if (!doctorId) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const reminder = await prisma.reminder.findFirst({
      where: { id: params.id, doctorId },
    })
    if (!reminder) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.reminder.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/reminders/[id]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
