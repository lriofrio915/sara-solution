/**
 * GET /api/cron/satisfaction-surveys
 *
 * Finds appointments completed ~2h ago that don't have a survey sent yet,
 * creates a survey token and sends a WhatsApp message with the survey link.
 *
 * Run hourly.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWA } from '@/lib/whatsapp'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

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
    // Window: appointments completed 1h50m - 2h10m ago
    const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000 - 10 * 60 * 1000)
    const windowEnd   = new Date(now.getTime() - 1 * 60 * 60 * 1000 - 50 * 60 * 1000)

    // Find completed appointments in window that don't have a survey yet
    const appointments = await prisma.appointment.findMany({
      where: {
        date: { gte: windowStart, lt: windowEnd },
        status: 'COMPLETED',
        satisfactionSurvey: null,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor:  { select: { id: true, name: true, slug: true } },
      },
    })

    if (appointments.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, sent: 0 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site'
    let sent = 0

    for (const appt of appointments) {
      const token = randomUUID()

      // Create the survey record
      await prisma.satisfactionSurvey.create({
        data: {
          doctorId:      appt.doctorId,
          patientId:     appt.patientId,
          appointmentId: appt.id,
          token,
          source:        'whatsapp',
        },
      })

      // Send WA to patient
      if (appt.patient.phone) {
        const surveyUrl = `${appUrl}/encuesta/${token}`
        const msg =
          `Hola *${appt.patient.name}* 😊\n\n` +
          `Gracias por tu visita con *${appt.doctor.name}*.\n\n` +
          `Nos gustaría conocer tu experiencia. ¿Podrías tomarte un minuto para calificar la atención?\n\n` +
          `👉 ${surveyUrl}\n\n` +
          `Tu opinión nos ayuda a mejorar el servicio. ¡Gracias! 🙏\n\n` +
          `_— Sara, Asistente Médico_`

        const ok = await sendWA(appt.patient.phone, msg)
        if (ok) sent++
      }
    }

    return NextResponse.json({ ok: true, checked: appointments.length, sent })
  } catch (err) {
    console.error('GET /api/cron/satisfaction-surveys:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
