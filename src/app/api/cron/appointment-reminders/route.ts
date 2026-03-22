/**
 * GET /api/cron/appointment-reminders
 *
 * Sends WhatsApp reminders for appointments:
 *   - 24h before  (marker: wa:{id})
 *   - 2h before   (marker: wa:2h:{id})
 *
 * Run this endpoint every hour via cron.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWA } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

function formatEcDate(date: Date): string {
  return date.toLocaleDateString('es-EC', {
    timeZone: 'America/Guayaquil',
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatEcTime(date: Date): string {
  return date.toLocaleTimeString('es-EC', {
    timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit',
  })
}

const TYPE_LABEL: Record<string, string> = {
  IN_PERSON:   'Presencial',
  TELECONSULT: 'Teleconsulta',
  HOME_VISIT:  'Visita domicilio',
  EMERGENCY:   'Emergencia',
  FOLLOW_UP:   'Seguimiento',
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const now = new Date()

    // ── Window 24h (±10 min) ──────────────────────────────────────────────────
    const w24Start = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 50 * 60 * 1000)
    const w24End   = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 1000)

    // ── Window 2h (±10 min) ───────────────────────────────────────────────────
    const w2hStart = new Date(now.getTime() + 1 * 60 * 60 * 1000 + 50 * 60 * 1000)
    const w2hEnd   = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 10 * 60 * 1000)

    // Fetch all appointments in either window
    const appointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        OR: [
          { date: { gte: w24Start, lt: w24End } },
          { date: { gte: w2hStart, lt: w2hEnd } },
        ],
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor:  { select: { id: true, name: true, whatsapp: true, phone: true } },
      },
    })

    if (appointments.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, sent: 0 })
    }

    // Load sent markers
    const markerKeys24 = appointments.map((a) => `wa:${a.id}`)
    const markerKeys2h = appointments.map((a) => `wa:2h:${a.id}`)
    const alreadySent = await prisma.reminder.findMany({
      where: {
        category: 'wa_appt_reminder',
        title: { in: [...markerKeys24, ...markerKeys2h] },
      },
      select: { title: true },
    })
    const sentSet = new Set(alreadySent.map((r) => r.title))

    let sent = 0
    let skipped = 0

    for (const appt of appointments) {
      const dateStr = formatEcDate(appt.date)
      const timeStr = formatEcTime(appt.date)
      const apptTime = appt.date.getTime()
      const is24h = apptTime >= w24Start.getTime() && apptTime < w24End.getTime()
      const is2h  = apptTime >= w2hStart.getTime() && apptTime < w2hEnd.getTime()

      // ── 24h reminder ─────────────────────────────────────────────────────────
      if (is24h) {
        const markerKey = `wa:${appt.id}`
        if (sentSet.has(markerKey)) { skipped++; continue }

        let anySent = false

        if (appt.patient.phone) {
          const msg =
            `Hola *${appt.patient.name}* 👋\n\n` +
            `Te recordamos que mañana tienes una *cita médica* 📅\n\n` +
            `👨‍⚕️ *Médico:* ${appt.doctor.name}\n` +
            `📅 *Fecha:* ${dateStr}\n` +
            `🕐 *Hora:* ${timeStr}\n` +
            `⏱ *Duración:* ${appt.duration} min\n` +
            (appt.reason ? `📋 *Motivo:* ${appt.reason}\n` : '') +
            `\nSi necesitas cancelar o reprogramar, comunícate con tu médico.\n\n` +
            `_— Sara, Asistente Médico_`
          const ok = await sendWA(appt.patient.phone, msg)
          if (ok) { sent++; anySent = true }
        }

        const doctorPhone = appt.doctor.whatsapp || appt.doctor.phone
        if (doctorPhone) {
          const msg =
            `📅 *Recordatorio — mañana*\n\n` +
            `👤 *Paciente:* ${appt.patient.name}\n` +
            `🕐 *Hora:* ${timeStr}\n` +
            `📋 *Tipo:* ${TYPE_LABEL[appt.type] ?? appt.type}\n` +
            (appt.reason ? `💬 *Motivo:* ${appt.reason}` : '')
          const ok = await sendWA(doctorPhone, msg)
          if (ok) { sent++; anySent = true }
        }

        if (anySent) {
          await prisma.reminder.create({
            data: { doctorId: appt.doctorId, title: markerKey, category: 'wa_appt_reminder', dueDate: appt.date, completed: true, completedAt: now, priority: 'LOW' },
          })
        }
      }

      // ── 2h reminder ──────────────────────────────────────────────────────────
      if (is2h) {
        const markerKey = `wa:2h:${appt.id}`
        if (sentSet.has(markerKey)) { skipped++; continue }

        let anySent = false

        if (appt.patient.phone) {
          const msg =
            `⏰ *Recordatorio — en 2 horas*\n\n` +
            `Hola *${appt.patient.name}*, tu cita con *${appt.doctor.name}* es hoy a las *${timeStr}*.\n\n` +
            `Por favor, preséntate 5 minutos antes. ¡Te esperamos! 😊\n\n` +
            `_— Sara, Asistente Médico_`
          const ok = await sendWA(appt.patient.phone, msg)
          if (ok) { sent++; anySent = true }
        }

        if (anySent) {
          await prisma.reminder.create({
            data: { doctorId: appt.doctorId, title: markerKey, category: 'wa_appt_reminder', dueDate: appt.date, completed: true, completedAt: now, priority: 'LOW' },
          })
        }
      }
    }

    return NextResponse.json({ ok: true, checked: appointments.length, sent, skipped })
  } catch (err) {
    console.error('GET /api/cron/appointment-reminders:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
