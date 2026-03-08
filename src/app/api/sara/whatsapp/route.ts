/**
 * Sara WhatsApp Endpoint — Scenario B (single shared number, multi-doctor)
 *
 * Flow:
 *   1. New phone → list all doctors → patient picks one
 *   2. Doctor selected → Sara greets and starts booking onboarding
 *   3. Ongoing conversation → route to the selected doctor's Sara
 *   4. Appointment booked → notify doctor via Evolution API
 *
 * Single-doctor tenants skip step 1 and go straight to step 2.
 *
 * POST /api/sara/whatsapp
 * Body: { phone, message, pushName }
 * Returns: { reply: string }
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { askSara } from '@/lib/sara'
import type { SaraMessage } from '@/lib/sara'

export const dynamic = 'force-dynamic'

const MAX_HISTORY = 20

type DoctorRow = {
  id: string
  name: string
  specialty: string
  address: string | null
  whatsapp: string | null
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function buildDoctorListMsg(doctors: DoctorRow[]): string {
  const list = doctors.map((d, i) => `*${i + 1}.* ${d.name} — ${d.specialty}`).join('\n')
  return (
    `¡Hola! 👋 Soy *Sara*, la asistente de agendamiento médico.\n\n` +
    `Por favor indícame con qué médico deseas agendar tu cita:\n\n${list}\n\n` +
    `Responde con el *número* o el *nombre* del médico. 📅`
  )
}

function parseDocktorSelection(input: string, doctors: DoctorRow[]): DoctorRow | null {
  const trimmed = input.trim().toLowerCase()
  const num = parseInt(trimmed, 10)
  if (!isNaN(num) && num >= 1 && num <= doctors.length) return doctors[num - 1]
  return (
    doctors.find((d) => {
      const lower = d.name.toLowerCase()
      return lower.includes(trimmed) || trimmed.includes(lower.split(' ')[0])
    }) ?? null
  )
}

function toWhatsApp(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '*$1*') // **bold** → *bold*
    .replace(/#{1,3}\s+/g, '')          // remove markdown headers
    .replace(/\n{3,}/g, '\n\n')         // max 2 blank lines
    .trim()
}

// ─── Doctor notification via Evolution API ────────────────────────────────────

async function notifyDoctorWhatsApp(
  doctorWhatsapp: string,
  patientPhone: string,
  saraReply: string,
): Promise<void> {
  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME
  if (!evolutionUrl || !evolutionKey || !instanceName) {
    console.warn('Sara WA: Evolution API env vars not set — skipping doctor notification')
    return
  }

  const doctorPhone = doctorWhatsapp.replace(/\D/g, '')
  const text = `📅 *Nueva cita agendada por WhatsApp*\nPaciente: +${patientPhone}\n\n${saraReply}`

  try {
    const res = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
      body: JSON.stringify({ number: doctorPhone, text }),
    })
    if (!res.ok) console.error('Sara WA: doctor notification failed', await res.text())
  } catch (err) {
    console.error('Sara WA: doctor notification error', err)
  }
}

// ─── Sara call (patient-facing) ───────────────────────────────────────────────

async function callSaraWhatsApp(
  doctor: DoctorRow,
  history: SaraMessage[],
): Promise<{ reply: string; appointmentBooked: boolean }> {
  let appointmentBooked = false
  const reply = await askSara(
    history,
    { doctorId: doctor.id, doctorName: doctor.name, doctorSpecialty: doctor.specialty },
    (event) => {
      if (event.type === 'tool_done' && event.name === 'schedule_appointment') {
        appointmentBooked = true
      }
    },
    6,
  )
  return { reply, appointmentBooked }
}

// ─── Start a fresh conversation with a doctor ─────────────────────────────────

async function startDoctorConversation(
  doctor: DoctorRow,
  cleanPhone: string,
  pushName: string | undefined,
  /** The patient's actual first message, or null when we just want Sara to greet */
  firstMessage: string | null,
  convTitle: string,
): Promise<NextResponse> {
  const patientLabel = pushName
    ? `"${pushName}" (WhatsApp +${cleanPhone})`
    : `WhatsApp +${cleanPhone}`

  const history: SaraMessage[] = []

  if (firstMessage) {
    // Single-doctor path: patient sent a real message — respond to it
    history.push({
      role: 'user',
      content: `[Sistema: Atiende al paciente ${patientLabel} por WhatsApp. Salúdalo y responde a su mensaje a continuación.]`,
    })
    history.push({ role: 'user', content: firstMessage })
  } else {
    // Post-selection path: patient just picked this doctor — greet them
    history.push({
      role: 'user',
      content: `[Sistema: El paciente ${patientLabel} ha seleccionado atenderse con ${doctor.name}. Salúdalo calurosamente, confírmale con qué médico va a trabajar y pregúntale en qué puedes ayudarle.]`,
    })
  }

  const { reply, appointmentBooked } = await callSaraWhatsApp(doctor, history)
  history.push({ role: 'assistant', content: reply })

  await prisma.saraConversation.create({
    data: {
      doctorId: doctor.id,
      context: 'whatsapp',
      title: convTitle,
      messages: history.slice(-MAX_HISTORY),
    },
  })

  if (appointmentBooked && doctor.whatsapp) {
    await notifyDoctorWhatsApp(doctor.whatsapp, cleanPhone, reply)
  }

  return NextResponse.json({ reply: toWhatsApp(reply) })
}

// ─── Continue an existing conversation ───────────────────────────────────────

async function handleOngoingConversation(
  conv: { id: string; messages: unknown },
  doctor: DoctorRow,
  message: string,
  cleanPhone: string,
): Promise<NextResponse> {
  const history: SaraMessage[] = (conv.messages as unknown as SaraMessage[]).slice(-MAX_HISTORY)
  history.push({ role: 'user', content: message })

  const { reply, appointmentBooked } = await callSaraWhatsApp(doctor, history)
  history.push({ role: 'assistant', content: reply })

  await prisma.saraConversation.update({
    where: { id: conv.id },
    data: { messages: history.slice(-MAX_HISTORY) },
  })

  if (appointmentBooked && doctor.whatsapp) {
    await notifyDoctorWhatsApp(doctor.whatsapp, cleanPhone, reply)
  }

  return NextResponse.json({ reply: toWhatsApp(reply) })
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // Auth
    const secret = req.headers.get('x-api-secret')
    if (secret !== process.env.WHATSAPP_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { phone, message, pushName } = body as {
      phone: string
      message: string
      pushName?: string
    }

    if (!phone || !message) {
      return NextResponse.json({ error: 'phone and message are required' }, { status: 400 })
    }

    const cleanPhone = phone.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    const convTitle = `wa_${cleanPhone}`

    // ── 1. Already talking to a doctor? ──────────────────────────────────────
    const activeConv = await prisma.saraConversation.findFirst({
      where: { title: convTitle, context: 'whatsapp' },
      orderBy: { updatedAt: 'desc' },
    })

    if (activeConv) {
      const doctor = await prisma.doctor.findUnique({
        where: { id: activeConv.doctorId },
        select: { id: true, name: true, specialty: true, address: true, whatsapp: true },
      })
      if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
      return handleOngoingConversation(activeConv, doctor, message, cleanPhone)
    }

    // ── 2. Load all doctors ───────────────────────────────────────────────────
    const allDoctors = await prisma.doctor.findMany({
      select: { id: true, name: true, specialty: true, address: true, whatsapp: true },
      orderBy: { name: 'asc' },
    })

    if (allDoctors.length === 0) {
      return NextResponse.json({ error: 'No doctors registered' }, { status: 404 })
    }

    // ── 3. Single doctor → skip selection ────────────────────────────────────
    if (allDoctors.length === 1) {
      return startDoctorConversation(allDoctors[0], cleanPhone, pushName, message, convTitle)
    }

    // ── 4. Multi-doctor selection flow ────────────────────────────────────────
    const selectConv = await prisma.saraConversation.findFirst({
      where: { title: convTitle, context: 'wa_select' },
      orderBy: { updatedAt: 'desc' },
    })

    if (!selectConv) {
      // First-ever contact: show the doctor list
      const welcomeMsg = buildDoctorListMsg(allDoctors)
      await prisma.saraConversation.create({
        data: {
          doctorId: allDoctors[0].id, // placeholder — not a real doctor assignment
          context: 'wa_select',
          title: convTitle,
          messages: [{ role: 'assistant', content: welcomeMsg }],
        },
      })
      return NextResponse.json({ reply: toWhatsApp(welcomeMsg) })
    }

    // Patient is replying to the doctor selection prompt
    const selected = parseDocktorSelection(message, allDoctors)

    if (!selected) {
      const retry =
        `No reconocí tu selección 😊 Por favor responde con el *número* o el *nombre* del médico:\n\n` +
        allDoctors.map((d, i) => `*${i + 1}.* ${d.name} — ${d.specialty}`).join('\n')
      await prisma.saraConversation.update({
        where: { id: selectConv.id },
        data: {
          messages: [
            ...(selectConv.messages as unknown as SaraMessage[]),
            { role: 'user', content: message },
            { role: 'assistant', content: retry },
          ],
        },
      })
      return NextResponse.json({ reply: toWhatsApp(retry) })
    }

    // Doctor confirmed → delete selection state + start real conversation
    await prisma.saraConversation.delete({ where: { id: selectConv.id } })
    return startDoctorConversation(selected, cleanPhone, pushName, null, convTitle)

  } catch (err) {
    console.error('POST /api/sara/whatsapp:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
