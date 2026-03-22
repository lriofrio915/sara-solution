import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') ?? 'pending' // pending | completed | all

    const reminders = await prisma.reminder.findMany({
      where: {
        doctorId: doctor.id,
        ...(filter === 'pending' && { completed: false }),
        ...(filter === 'completed' && { completed: true }),
      },
      orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
    })

    return NextResponse.json(reminders)
  } catch (err) {
    console.error('GET /api/reminders:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const body = await req.json()
    const { title, description, dueDate, priority, category } = body

    if (!title?.trim()) return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
    if (!dueDate) return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 })

    const reminder = await prisma.reminder.create({
      data: {
        doctorId: doctor.id,
        title: String(title).trim(),
        description: description?.trim() || null,
        dueDate: new Date(dueDate),
        priority: priority ?? 'MEDIUM',
        category: category?.trim() || null,
      },
    })

    return NextResponse.json(reminder, { status: 201 })
  } catch (err) {
    console.error('POST /api/reminders:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
