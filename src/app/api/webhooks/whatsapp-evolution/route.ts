/**
 * Evolution API Webhook — Per-doctor WhatsApp agent
 *
 * Each doctor has their own Evolution instance (evolutionInstance field).
 * When a patient writes to that doctor's WA Business number, Evolution
 * POSTs here. We identify the doctor from `instance`, run Sara AI with
 * that doctor's knowledge, and reply using the same instance.
 *
 * Configure in Evolution:
 *   Webhook URL: https://your-domain.com/api/webhooks/whatsapp-evolution
 *   Events: messages.upsert
 *
 * POST /api/webhooks/whatsapp-evolution
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWA } from '@/lib/whatsapp'
import { askSara } from '@/lib/sara'
import type { SaraMessage } from '@/lib/sara'
import { getEffectivePlan } from '@/lib/plan'

export const dynamic = 'force-dynamic'

const MAX_HISTORY = 20
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// ─── Evolution payload types ──────────────────────────────────────────────────

type MsgData = {
  key?: {
    remoteJid?: string
    fromMe?: boolean
    id?: string
  }
  pushName?: string
  message?: {
    conversation?: string
    extendedTextMessage?: { text?: string }
    imageMessage?: { caption?: string }
    buttonsResponseMessage?: { selectedDisplayText?: string }
    listResponseMessage?: { title?: string }
  }
  messageType?: string
}

type EvolutionPayload = {
  event: string
  instance: string
  // Evolution v2 may send data as object or as array of messages
  data?: MsgData | MsgData[]
}

function getMessageData(payload: EvolutionPayload): MsgData | null {
  if (!payload.data) return null
  // Normalize: some Evolution v2 versions wrap in array
  if (Array.isArray(payload.data)) {
    return payload.data[0] ?? null
  }
  return payload.data
}

function extractText(data: MsgData): string | null {
  const msg = data.message
  if (!msg) return null
  return (
    msg.conversation?.trim() ||
    msg.extendedTextMessage?.text?.trim() ||
    msg.buttonsResponseMessage?.selectedDisplayText?.trim() ||
    msg.listResponseMessage?.title?.trim() ||
    null
  )
}

// ─── Doctor context builder ───────────────────────────────────────────────────

type DoctorRow = {
  id: string
  name: string
  specialty: string
  address: string | null
  phone: string | null
  whatsapp: string | null
  evolutionInstance: string | null
  province: string | null
  canton: string | null
  services: string | null
  consultationModes: string | null
  insurances: string | null
  saraPatientInstructions: string | null
  patientFaq: string | null
  plan: string
  trialEndsAt: Date | null
  availabilitySchedules: { weekday: number; startTime: string; endTime: string; location: string | null }[]
}

function buildConsultorioInfo(doctor: DoctorRow): string {
  const lines: string[] = []
  const location = [doctor.canton, doctor.province].filter(Boolean).join(', ')
  if (location) lines.push(`- Ubicación: ${location}`)
  if (doctor.address) lines.push(`- Dirección: ${doctor.address}`)
  if (doctor.whatsapp) lines.push(`- WhatsApp business: ${doctor.whatsapp}`)

  try {
    const modes: string[] = JSON.parse(doctor.consultationModes ?? '[]')
    const modeMap: Record<string, string> = {
      IN_PERSON: 'Presencial', TELECONSULT: 'Teleconsulta', HOME_VISIT: 'Visita domiciliaria',
    }
    const modesText = modes.map(m => modeMap[m] ?? m).join(', ')
    if (modesText) lines.push(`- Modalidades: ${modesText}`)
  } catch { /* ignore */ }

  if (doctor.availabilitySchedules.length > 0) {
    lines.push('- Horario de atención:')
    for (const s of doctor.availabilitySchedules) {
      lines.push(`  ${DAYS[s.weekday]}: ${s.startTime} – ${s.endTime}${s.location ? ` (${s.location})` : ''}`)
    }
  }

  try {
    const parsed = JSON.parse(doctor.services ?? '[]')
    if (Array.isArray(parsed) && parsed.length > 0) {
      lines.push('- Servicios:')
      for (const s of parsed) {
        lines.push(`  • ${s.name}${s.price ? ` ($${s.price})` : ''}`)
      }
    }
  } catch { /* ignore */ }

  try {
    const ins: { name: string; active: boolean; requirements?: string }[] = JSON.parse(doctor.insurances ?? '[]')
    const active = ins.filter(i => i.active)
    if (active.length > 0) {
      lines.push('- Seguros/convenios aceptados:')
      for (const i of active) {
        lines.push(`  • ${i.name}${i.requirements ? ` (${i.requirements})` : ''}`)
      }
    }
  } catch { /* ignore */ }

  try {
    const faqItems: { question: string; answer: string }[] = JSON.parse(doctor.patientFaq ?? '[]')
    const valid = faqItems.filter(f => f.question?.trim() && f.answer?.trim())
    if (valid.length > 0) {
      lines.push('- Preguntas frecuentes (responde exactamente así):')
      for (const f of valid) {
        lines.push(`  P: ${f.question.trim()}`)
        lines.push(`  R: ${f.answer.trim()}`)
      }
    }
  } catch { /* ignore */ }

  return lines.join('\n')
}

function toWhatsApp(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '*$1*')
    .replace(/#{1,3}\s+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Sara call ────────────────────────────────────────────────────────────────

async function callSara(
  doctor: DoctorRow,
  history: SaraMessage[],
): Promise<{ reply: string; appointmentBooked: boolean }> {
  let appointmentBooked = false

  const reply = await askSara(
    history,
    {
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      consultorioInfo: buildConsultorioInfo(doctor),
      saraPersonality: doctor.saraPatientInstructions ?? undefined,
    },
    (event) => {
      if (event.type === 'tool_done' && event.name === 'schedule_appointment') {
        appointmentBooked = true
      }
    },
    6,
  )

  if (reply.includes('No tengo ese dato')) {
    const patientMsg = [...history].reverse().find(m => m.role === 'user')?.content
    if (patientMsg && !patientMsg.startsWith('[Sistema:')) {
      prisma.saraUnansweredQuestion.create({
        data: { doctorId: doctor.id, question: patientMsg.trim(), source: 'whatsapp' },
      }).catch(() => {/* non-critical */})
    }
  }

  return { reply, appointmentBooked }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // ── Auth: Evolution sends its API key in the header ─────────────────────
    const apiKey = req.headers.get('apikey')
    const expectedKey = process.env.EVOLUTION_API_KEY
    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await req.json() as EvolutionPayload

    // Only process incoming text messages (Evolution sends lowercase or uppercase event names)
    const event = payload.event?.toLowerCase()
    if (event !== 'messages.upsert') {
      return NextResponse.json({ ok: true })
    }

    const msgData = getMessageData(payload)
    if (!msgData) return NextResponse.json({ ok: true })

    if (msgData.key?.fromMe) {
      return NextResponse.json({ ok: true }) // ignore outgoing messages
    }

    const messageText = extractText(msgData)
    if (!messageText) {
      return NextResponse.json({ ok: true }) // ignore non-text (audio, images, etc.)
    }

    const instanceName = payload.instance
    const remoteJid = msgData.key?.remoteJid ?? ''
    const cleanPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    const pushName = msgData.pushName

    if (!cleanPhone) {
      return NextResponse.json({ ok: true })
    }

    // ── Find doctor by evolution instance ───────────────────────────────────
    const doctor = await prisma.doctor.findFirst({
      where: { evolutionInstance: instanceName },
      select: {
        id: true, name: true, specialty: true, address: true, phone: true, whatsapp: true,
        evolutionInstance: true,
        province: true, canton: true, services: true, consultationModes: true,
        insurances: true, saraPatientInstructions: true, patientFaq: true,
        plan: true, trialEndsAt: true,
        availabilitySchedules: { where: { isActive: true }, orderBy: { weekday: 'asc' } },
      },
    })

    if (!doctor) {
      console.warn(`WA webhook: no doctor found for instance "${instanceName}"`)
      return NextResponse.json({ ok: true })
    }

    // ── Check plan ───────────────────────────────────────────────────────────
    const effectivePlan = getEffectivePlan(doctor)
    if (effectivePlan === 'FREE') {
      return NextResponse.json({ ok: true }) // silently ignore — doctor is on free plan
    }

    // ── Load or create conversation ──────────────────────────────────────────
    // Key: doctorId + title so each doctor-patient pair is independent
    const convTitle = `wa_${cleanPhone}`

    let conv = await prisma.saraConversation.findFirst({
      where: { doctorId: doctor.id, title: convTitle, context: 'whatsapp' },
      orderBy: { updatedAt: 'desc' },
    })

    const patientLabel = pushName
      ? `"${pushName}" (WhatsApp +${cleanPhone})`
      : `WhatsApp +${cleanPhone}`

    // ── Keyword: patient requests human ─────────────────────────────────────
    const HUMAN_KEYWORDS = /\b(humano|persona|doctor|médico|medico|agente humano|hablar con alguien)\b/i
    if (HUMAN_KEYWORDS.test(messageText) && conv && !conv.humanMode) {
      await prisma.saraConversation.update({
        where: { id: conv.id },
        data: {
          humanMode: true,
          messages: [
            ...(conv.messages as unknown as SaraMessage[]).slice(-MAX_HISTORY),
            { role: 'user', content: messageText },
            { role: 'assistant', content: '[Modo humano activado]' },
          ] as unknown as never,
        },
      })
      const handoffMsg = `Entendido. 🙏 He notificado al *${doctor.name}* o su equipo para que te atiendan personalmente. Por favor espera unos momentos.`
      if (doctor.whatsapp) {
        sendWA(
          doctor.whatsapp.replace(/\D/g, ''),
          `⚠️ *Paciente solicita atención humana*\nPaciente: +${cleanPhone}${pushName ? ` (${pushName})` : ''}\nMensaje: "${messageText}"\n\nResponde directamente a +${cleanPhone} en WhatsApp.`,
          instanceName,
        ).catch(() => {/* non-critical */})
      }
      await sendWA(remoteJid, handoffMsg, instanceName)
      return NextResponse.json({ ok: true })
    }

    // ── Human mode active — store message, notify doctor, don't call Sara ───
    if (conv?.humanMode) {
      const history = (conv.messages as unknown as SaraMessage[]).slice(-MAX_HISTORY)
      history.push({ role: 'user', content: messageText })
      await prisma.saraConversation.update({
        where: { id: conv.id },
        data: { messages: history as unknown as never },
      })
      // Notify doctor again (non-fatal)
      if (doctor.whatsapp) {
        sendWA(
          doctor.whatsapp.replace(/\D/g, ''),
          `📩 *Nuevo mensaje de +${cleanPhone}${pushName ? ` (${pushName})` : ''}*\n"${messageText}"`,
          instanceName,
        ).catch(() => {/* non-critical */})
      }
      return NextResponse.json({ ok: true })
    }

    // ── Normal Sara flow ─────────────────────────────────────────────────────
    let history: SaraMessage[]

    if (conv) {
      history = (conv.messages as unknown as SaraMessage[]).slice(-MAX_HISTORY)
      history.push({ role: 'user', content: messageText })
    } else {
      history = [
        {
          role: 'user',
          content: `[Sistema: Atiende al paciente ${patientLabel} por WhatsApp. Salúdalo y responde a su mensaje a continuación.]`,
        },
        { role: 'user', content: messageText },
      ]
    }

    // ── Call Sara ────────────────────────────────────────────────────────────
    const { reply, appointmentBooked } = await callSara(doctor, history)
    history.push({ role: 'assistant', content: reply })

    // ── Persist conversation ─────────────────────────────────────────────────
    if (conv) {
      await prisma.saraConversation.update({
        where: { id: conv.id },
        data: { messages: history.slice(-MAX_HISTORY) as unknown as never },
      })
    } else {
      conv = await prisma.saraConversation.create({
        data: {
          doctorId: doctor.id,
          context: 'whatsapp',
          title: convTitle,
          messages: history.slice(-MAX_HISTORY) as unknown as never,
        },
      })
    }

    // ── Notify doctor when appointment is booked ─────────────────────────────
    if (appointmentBooked && doctor.whatsapp) {
      const notif = `📅 *Nueva cita agendada por WhatsApp*\nPaciente: +${cleanPhone}\n\n${reply}`
      sendWA(doctor.whatsapp, notif, instanceName).catch(() => {/* non-critical */})
    }

    // ── Send reply to patient ────────────────────────────────────────────────
    await sendWA(remoteJid, toWhatsApp(reply), instanceName)

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('POST /api/webhooks/whatsapp-evolution:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
