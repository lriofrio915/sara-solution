/**
 * GET /api/cron/birthday-reminders
 *
 * Sends WhatsApp birthday messages for patients whose birthday is today.
 * - Sends to the doctor: "Hoy es el cumpleaños de [Nombre]"
 * - Sends to the patient (if has phone): birthday greeting on behalf of doctor
 * - Uses Reminder with category:'wa_birthday' + year to avoid duplicates.
 *
 * Run daily (e.g. at 08:00 via cron/scheduler).
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
    const todayMonth = now.getMonth() + 1  // 1-12
    const todayDay   = now.getDate()
    const thisYear   = now.getFullYear()

    // Find all patients whose birthdate month+day matches today
    // PostgreSQL: EXTRACT(MONTH/DAY from "birthDate")
    const patients = await prisma.$queryRaw<Array<{
      id: string
      name: string
      phone: string | null
      doctorId: string
      doctorName: string
      doctorPhone: string | null
      doctorWhatsapp: string | null
    }>>`
      SELECT
        p.id, p.name, p.phone, p."doctorId",
        d.name AS "doctorName",
        d.phone AS "doctorPhone",
        d.whatsapp AS "doctorWhatsapp"
      FROM "Patient" p
      JOIN "Doctor" d ON d.id = p."doctorId"
      WHERE p."birthDate" IS NOT NULL
        AND EXTRACT(MONTH FROM p."birthDate") = ${todayMonth}
        AND EXTRACT(DAY FROM p."birthDate") = ${todayDay}
    `

    if (patients.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, sent: 0 })
    }

    // Load already-sent markers for this year
    const markerKeys = patients.map((p) => `birthday:${p.id}:${thisYear}`)
    const alreadySent = await prisma.reminder.findMany({
      where: { category: 'wa_birthday', title: { in: markerKeys } },
      select: { title: true },
    })
    const sentSet = new Set(alreadySent.map((r) => r.title))

    let sent = 0

    for (const patient of patients) {
      const markerKey = `birthday:${patient.id}:${thisYear}`
      if (sentSet.has(markerKey)) continue

      let anySent = false

      // ── Notify doctor ───────────────────────────────────────
      const doctorPhone = patient.doctorWhatsapp || patient.doctorPhone
      if (doctorPhone) {
        const msg =
          `🎂 *Recordatorio de cumpleaños*\n\n` +
          `Hoy es el cumpleaños de tu paciente *${patient.name}*.\n\n` +
          `Es un buen momento para enviarle un saludo y mantener el vínculo. 😊\n\n` +
          `_— Sara, Asistente Médico_`

        const ok = await sendWA(doctorPhone, msg)
        if (ok) { sent++; anySent = true }
      }

      // ── Greet patient ───────────────────────────────────────
      if (patient.phone) {
        const msg =
          `🎉 ¡Feliz cumpleaños, *${patient.name}*!\n\n` +
          `El consultorio del *${patient.doctorName}* te desea un excelente día lleno de salud y alegría. 🌟\n\n` +
          `_— Sara, Asistente Médico_`

        const ok = await sendWA(patient.phone, msg)
        if (ok) { sent++; anySent = true }
      }

      // ── Mark as sent ────────────────────────────────────────
      if (anySent) {
        await prisma.reminder.create({
          data: {
            doctorId:    patient.doctorId,
            title:       markerKey,
            category:    'wa_birthday',
            dueDate:     now,
            completed:   true,
            completedAt: now,
            priority:    'LOW',
          },
        })
      }
    }

    return NextResponse.json({ ok: true, checked: patients.length, sent })
  } catch (err) {
    console.error('GET /api/cron/birthday-reminders:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
