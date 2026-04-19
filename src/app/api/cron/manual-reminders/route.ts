/**
 * GET /api/cron/manual-reminders
 *
 * Sends WhatsApp to the doctor's personal phone when a manual reminder is due.
 * Excludes system-generated markers (wa_appt_reminder, wa_birthday).
 * Run every 15 minutes via cron.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWA } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    const dueReminders = await prisma.reminder.findMany({
      where: {
        completed: false,
        dueDate: { lte: now },
        category: { notIn: ['wa_appt_reminder', 'wa_birthday'] },
      },
      include: {
        doctor: { select: { id: true, name: true, phone: true, whatsapp: true } },
      },
    })

    if (dueReminders.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 })
    }

    let sent = 0
    let failed = 0

    for (const reminder of dueReminders) {
      const phone = reminder.doctor.phone || reminder.doctor.whatsapp
      if (!phone) {
        failed++
        continue
      }

      const msg =
        `⏰ *Recordatorio vencido*\n\n` +
        `📌 *${reminder.title}*\n` +
        (reminder.description ? `📝 ${reminder.description}\n` : '') +
        `\n_— Sara, tu Asistente Médico_`

      const ok = await sendWA(phone, msg)

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { completed: true, completedAt: now },
      })

      if (ok) sent++
      else failed++
    }

    return NextResponse.json({ ok: true, processed: dueReminders.length, sent, failed })
  } catch (err) {
    console.error('GET /api/cron/manual-reminders:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
