/**
 * POST /api/appointments/[id]/remind
 * Sends an immediate WhatsApp reminder for a specific appointment.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const appt = await prisma.appointment.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      include: {
        patient: { select: { name: true, phone: true } },
        doctor:  { select: { name: true, whatsapp: true, phone: true } },
      },
    })
    if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

    const dateStr = formatEcDate(appt.date)
    const timeStr = formatEcTime(appt.date)
    let sent = 0

    if (appt.patient.phone) {
      const msg =
        `Hola *${appt.patient.name}* 👋\n\n` +
        `Te enviamos un recordatorio de tu *cita médica* 📅\n\n` +
        `👨‍⚕️ *Médico:* ${appt.doctor.name}\n` +
        `📅 *Fecha:* ${dateStr}\n` +
        `🕐 *Hora:* ${timeStr}\n` +
        `⏱ *Duración:* ${appt.duration} min\n` +
        (appt.reason ? `📋 *Motivo:* ${appt.reason}\n` : '') +
        `\nSi necesitas cancelar o reprogramar, comunícate con tu médico.\n\n` +
        `_— Sara, Asistente Médico_`
      const ok = await sendWA(appt.patient.phone, msg)
      if (ok) sent++
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('POST /api/appointments/[id]/remind:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
