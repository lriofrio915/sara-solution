/**
 * Sara WhatsApp Endpoint
 *
 * Called by n8n after receiving a message from Evolution API.
 * Authenticated via x-api-secret header (WHATSAPP_API_SECRET env var).
 *
 * POST /api/sara/whatsapp
 * Body: { phone, message, pushName, instanceName }
 * Returns: { reply: string }
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { askSara } from '@/lib/sara'
import type { SaraMessage } from '@/lib/sara'

export const dynamic = 'force-dynamic'

// Max messages kept in WhatsApp conversation history
const MAX_HISTORY = 20

function buildWhatsappSystemPrompt(doctorName: string, doctorSpecialty: string, address: string | null): string {
  const now = new Date().toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    dateStyle: 'full',
    timeStyle: 'short',
  })

  return `Eres Sara, la asistente virtual de ${doctorName}, especialista en ${doctorSpecialty}.
Fecha y hora actual: ${now}
${address ? `Consultorio: ${address}` : ''}

## Tu rol en WhatsApp:
Atiendes a los PACIENTES (no al médico) que escriben por WhatsApp para:
- Agendar, confirmar o cancelar citas
- Consultar disponibilidad de horarios
- Preguntar por dirección, horarios y datos del consultorio
- Confirmar si ya están registrados como pacientes

## Personalidad:
- Cálida, amable y profesional
- Respuestas cortas y claras (máximo 3-4 líneas por mensaje)
- Usa emojis con moderación (📅 ✅ ❌ 🏥)
- Siempre en español

## Flujo para agendar cita:
1. Saluda y pide el nombre completo si no lo tienes
2. Pregunta la fecha deseada
3. Usa check_available_slots para ver disponibilidad
4. Ofrece máximo 3 opciones de horario
5. Confirma la cita con schedule_appointment
6. Envía resumen de confirmación

## Restricciones importantes:
- NO des consejos médicos, diagnósticos ni tratamientos
- NO compartas información de otros pacientes
- Si el paciente pregunta algo médico, dile que consulte directamente con ${doctorName}
- Para cancelar citas, indícales que llamen al consultorio directamente (aún no tienes esa función)

## Registro de paciente nuevo:
Si el paciente no está registrado, usa register_patient con su nombre y teléfono.
El teléfono ya lo tienes (viene del sistema), úsalo automáticamente.`
}

export async function POST(req: Request) {
  try {
    // Validate secret
    const secret = req.headers.get('x-api-secret')
    if (secret !== process.env.WHATSAPP_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { phone, message, pushName, instanceName } = body as {
      phone: string
      message: string
      pushName?: string
      instanceName?: string
    }

    if (!phone || !message) {
      return NextResponse.json({ error: 'phone and message are required' }, { status: 400 })
    }

    // Clean phone: remove @s.whatsapp.net if present, keep digits only with country code
    const cleanPhone = phone.replace('@s.whatsapp.net', '').replace(/\D/g, '')

    // Find doctor by instanceName (slug) — fallback: first active doctor
    let doctor = null
    if (instanceName) {
      doctor = await prisma.doctor.findFirst({
        where: { slug: instanceName },
        select: { id: true, name: true, specialty: true, address: true },
      })
    }
    if (!doctor) {
      doctor = await prisma.doctor.findFirst({
        select: { id: true, name: true, specialty: true, address: true },
        orderBy: { createdAt: 'asc' },
      })
    }
    if (!doctor) {
      return NextResponse.json({ error: 'No doctor found' }, { status: 404 })
    }

    // Load or create WhatsApp conversation for this phone + doctor
    const convTitle = `wa_${cleanPhone}`
    let conv = await prisma.saraConversation.findFirst({
      where: { doctorId: doctor.id, context: 'whatsapp', title: convTitle },
      orderBy: { createdAt: 'desc' },
    })

    const history: SaraMessage[] = conv
      ? (conv.messages as SaraMessage[]).slice(-MAX_HISTORY)
      : []

    // Auto-inject patient phone context on first message
    const isFirstMessage = history.length === 0
    if (isFirstMessage && pushName) {
      history.push({
        role: 'user',
        content: `[Sistema: El paciente se identifica como "${pushName}" y su número de WhatsApp es +${cleanPhone}]`,
      })
    }

    // Append the new user message
    history.push({ role: 'user', content: message })

    // Call Sara (synchronous, no streaming needed for WhatsApp)
    const reply = await askSara(
      history,
      {
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty,
      },
      undefined, // no event callback needed
      6,
    )

    // Append Sara's reply to history
    history.push({ role: 'assistant', content: reply })

    // Persist conversation (keep last MAX_HISTORY messages)
    const trimmed = history.slice(-MAX_HISTORY)
    if (conv) {
      await prisma.saraConversation.update({
        where: { id: conv.id },
        data: { messages: trimmed },
      })
    } else {
      await prisma.saraConversation.create({
        data: {
          doctorId: doctor.id,
          context: 'whatsapp',
          title: convTitle,
          messages: trimmed,
        },
      })
    }

    // Strip markdown for WhatsApp (bold **text** → *text*, remove ### headers)
    const whatsappReply = reply
      .replace(/\*\*(.*?)\*\*/g, '*$1*')   // **bold** → *bold* (WhatsApp bold)
      .replace(/#{1,3}\s+/g, '')            // remove markdown headers
      .replace(/\n{3,}/g, '\n\n')           // max 2 consecutive newlines
      .trim()

    return NextResponse.json({ reply: whatsappReply })
  } catch (err) {
    console.error('POST /api/sara/whatsapp:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
