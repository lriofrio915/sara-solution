/**
 * GET /api/cron/appointment-reminders
 *
 * Sends WhatsApp reminders for appointments happening in the next ~24 hours.
 * Uses the Reminder model to track sent messages and avoid duplicates.
 *
 * Call this endpoint every hour via Vercel Cron or any external scheduler.
 * Protect with CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ─── WhatsApp sender (Evolution API) ─────────────────────────────────────────

async function sendWA(to: string, text: string): Promise<boolean> {
  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME
  if (!evolutionUrl || !evolutionKey || !instanceName) return false

  const phone = to.replace(/\D/g, '')
  if (phone.length < 7) return false

  try {
    const res = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
      body: JSON.stringify({ number: phone, text }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth — allow Vercel Cron (no secret) or external cron with Bearer token
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // Window: appointments between 23h 50m and 24h 10m from now (20 min window)
    // With an hourly cron, each appointment falls in this window exactly once.
    const now = new Date()
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 50 * 60 * 1000)
    const windowEnd   = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 1000)

    const appointments = await prisma.appointment.findMany({
      where: {
        date: { gte: windowStart, lt: windowEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor:  { select: { id: true, name: true, whatsapp: true, phone: true } },
      },
    })

    if (appointments.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, sent: 0 })
    }

    // Load already-sent reminder markers for these appointments
    const apptIds = appointments.map((a) => a.id)
    const alreadySent = await prisma.reminder.findMany({
      where: {
        category: 'wa_appt_reminder',
        title: { in: apptIds.map((id) => `wa:${id}`) },
      },
      select: { title: true },
    })
    const sentSet = new Set(alreadySent.map((r) => r.title))

    let sent = 0
    let skipped = 0

    for (const appt of appointments) {
      const markerKey = `wa:${appt.id}`

      // Skip if already sent
      if (sentSet.has(markerKey)) {
        skipped++
        continue
      }

      const dateStr = formatEcDate(appt.date)
      const timeStr = formatEcTime(appt.date)
      let anySent = false

      // ── Send to patient ──────────────────────────────────────────────────
      if (appt.patient.phone) {
        const msg =
          `Hola *${appt.patient.name}* 👋\n\n` +
          `Te recordamos que mañana tienes una *cita médica* 📅\n\n` +
          `👨‍⚕️ *Médico:* Dr. ${appt.doctor.name}\n` +
          `📅 *Fecha:* ${dateStr}\n` +
          `🕐 *Hora:* ${timeStr}\n` +
          `⏱ *Duración:* ${appt.duration} min\n` +
          (appt.reason ? `📋 *Motivo:* ${appt.reason}\n` : '') +
          `\nSi necesitas cancelar o reprogramar, comunícate con tu médico.\n\n` +
          `_— Sara, Asistente Médico_`

        const ok = await sendWA(appt.patient.phone, msg)
        if (ok) { sent++; anySent = true }
      }

      // ── Send to doctor ───────────────────────────────────────────────────
      const doctorPhone = appt.doctor.whatsapp || appt.doctor.phone
      if (doctorPhone) {
        const msg =
          `📅 *Recordatorio de cita — mañana*\n\n` +
          `👤 *Paciente:* ${appt.patient.name}\n` +
          `🕐 *Hora:* ${timeStr}\n` +
          `📋 *Tipo:* ${TYPE_LABEL[appt.type] ?? appt.type}\n` +
          (appt.reason ? `💬 *Motivo:* ${appt.reason}` : '')

        const ok = await sendWA(doctorPhone, msg)
        if (ok) { sent++; anySent = true }
      }

      // ── Mark as sent to avoid duplicates ────────────────────────────────
      if (anySent) {
        await prisma.reminder.create({
          data: {
            doctorId:    appt.doctorId,
            title:       markerKey,
            category:    'wa_appt_reminder',
            dueDate:     appt.date,
            completed:   true,
            completedAt: new Date(),
            priority:    'LOW',
          },
        })
      }
    }

    return NextResponse.json({
      ok: true,
      checked: appointments.length,
      sent,
      skipped,
      window: { from: windowStart.toISOString(), to: windowEnd.toISOString() },
    })
  } catch (err) {
    console.error('GET /api/cron/appointment-reminders:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
