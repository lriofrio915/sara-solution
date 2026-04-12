import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

type NotificationItem = {
  type: 'appointment' | 'reminder' | 'whatsapp'
  label: string
  href: string
}

// GET /api/notifications/count — returns unread notification count + top 5 items
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })

  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(23, 59, 59, 999)

  const [appointments, reminders, conversations] = await Promise.all([
    // Citas de hoy y mañana sin confirmar
    prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: 'SCHEDULED',
        date: { gte: now, lte: tomorrow },
      },
      select: { id: true, date: true },
      orderBy: { date: 'asc' },
      take: 5,
    }),
    // Recordatorios vencidos no completados
    prisma.reminder.findMany({
      where: {
        doctorId: doctor.id,
        completed: false,
        dueDate: { lte: now },
      },
      select: { id: true, title: true },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
    // Conversaciones WhatsApp en modo humano
    prisma.saraConversation.findMany({
      where: {
        doctorId: doctor.id,
        humanMode: true,
      },
      select: { id: true, title: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ])

  const items: NotificationItem[] = []

  for (const appt of appointments) {
    const d = new Date(appt.date)
    const label = `Cita sin confirmar: ${d.toLocaleDateString('es-EC', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    items.push({ type: 'appointment', label, href: '/appointments' })
  }

  for (const rem of reminders) {
    items.push({ type: 'reminder', label: `Recordatorio vencido: ${rem.title}`, href: '/reminders' })
  }

  for (const conv of conversations) {
    const phone = conv.title ?? 'Paciente'
    items.push({ type: 'whatsapp', label: `WhatsApp esperando respuesta: ${phone}`, href: '/integraciones/conversaciones' })
  }

  const count = appointments.length + reminders.length + conversations.length

  return NextResponse.json({ count, items: items.slice(0, 5) })
}
