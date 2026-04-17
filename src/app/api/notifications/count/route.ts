import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

type NotificationItem = {
  type: 'appointment' | 'reminder' | 'whatsapp' | 'credit_recharge' | 'credit_approved'
  label: string
  href: string
  createdAt: string
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
      select: { id: true, title: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
    // Conversaciones WhatsApp en modo humano
    prisma.saraConversation.findMany({
      where: {
        doctorId: doctor.id,
        humanMode: true,
      },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ])

  const items: NotificationItem[] = []

  for (const appt of appointments) {
    const d = new Date(appt.date)
    items.push({ type: 'appointment', label: `Cita sin confirmar: ${d.toLocaleDateString('es-EC', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, href: '/appointments', createdAt: d.toISOString() })
  }

  for (const rem of reminders) {
    items.push({ type: 'reminder', label: `Recordatorio vencido: ${rem.title}`, href: '/reminders', createdAt: new Date(rem.dueDate).toISOString() })
  }

  for (const conv of conversations) {
    const phone = conv.title ?? 'Paciente'
    items.push({ type: 'whatsapp', label: `WhatsApp esperando respuesta: ${phone}`, href: '/integraciones/conversaciones', createdAt: new Date(conv.updatedAt).toISOString() })
  }

  let creditRecharges: { id: string; credits: number; createdAt: Date; doctor: { name: string } }[] = []
  if (user.email === 'lriofrio915@gmail.com') {
    creditRecharges = await prisma.creditRecharge.findMany({
      where: { status: 'PENDING' },
      select: { id: true, credits: true, createdAt: true, doctor: { select: { name: true } } },
      take: 5,
      orderBy: { createdAt: 'asc' },
    })
    for (const r of creditRecharges) {
      items.push({ type: 'credit_recharge', label: `Recarga pendiente: ${r.doctor.name} — ${r.credits} cr.`, href: '/admin/credits', createdAt: r.createdAt.toISOString() })
    }
  }

  // Créditos aprobados en las últimas 24h (solo para médicos no-admin)
  let approvedRecharges: { id: string; credits: number; approvedAt: Date | null }[] = []
  if (user.email !== 'lriofrio915@gmail.com') {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    approvedRecharges = await prisma.creditRecharge.findMany({
      where: { doctorId: doctor.id, status: 'APPROVED', approvedAt: { gte: since24h } },
      select: { id: true, credits: true, approvedAt: true },
      orderBy: { approvedAt: 'desc' },
      take: 3,
    })
    for (const r of approvedRecharges) {
      items.push({
        type: 'credit_approved',
        label: `¡${r.credits} créditos acreditados en tu cuenta!`,
        href: '/marketing',
        createdAt: r.approvedAt!.toISOString(),
      })
    }
  }

  const count = appointments.length + reminders.length + conversations.length + creditRecharges.length + approvedRecharges.length

  return NextResponse.json({ count, items: items.slice(0, 5) })
}
