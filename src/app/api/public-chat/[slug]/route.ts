/**
 * POST /api/public-chat/[slug]
 * Sara AI chat for the public doctor page. No auth required.
 * Fetches doctor info by slug to build a contextual system prompt.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://consultorio.site',
    'X-Title': 'Sara Medical Doctor Chat',
  },
})

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { messages } = await req.json() as { messages: ChatMessage[] }

    // Fetch doctor info
    const doctor = await prisma.doctor.findUnique({
      where: { slug: params.slug },
      select: {
        id: true, name: true, specialty: true, bio: true,
        address: true, phone: true, whatsapp: true,
        services: true, consultationModes: true,
        province: true, canton: true, insurances: true, saraPatientInstructions: true, patientFaq: true,
        availabilitySchedules: { where: { isActive: true }, orderBy: { weekday: 'asc' } },
      },
    })

    if (!doctor) {
      return NextResponse.json({ text: 'Lo siento, no encontré información de este médico.' })
    }

    // Build schedule summary
    const scheduleLines: string[] = []
    for (const s of doctor.availabilitySchedules) {
      scheduleLines.push(`  ${DAYS[s.weekday]}: ${s.startTime} – ${s.endTime}${s.location ? ` (${s.location})` : ''}`)
    }

    // Build services summary
    let servicesText = ''
    try {
      const parsed = JSON.parse(doctor.services ?? '[]')
      if (Array.isArray(parsed) && parsed.length > 0) {
        servicesText = parsed.map((s: { name: string; price?: string }) =>
          `  - ${s.name}${s.price ? ` (${s.price})` : ''}`
        ).join('\n')
      }
    } catch { /* ignore */ }

    // Build modes summary
    let modesText = ''
    try {
      const modes: string[] = JSON.parse(doctor.consultationModes ?? '[]')
      const modeMap: Record<string, string> = {
        IN_PERSON: 'Presencial', TELECONSULT: 'Teleconsulta', HOME_VISIT: 'Visita domiciliaria',
      }
      modesText = modes.map(m => modeMap[m] ?? m).join(', ')
    } catch { /* ignore */ }

    // Build FAQ summary
    let faqText = ''
    try {
      const faqItems: { question: string; answer: string }[] = JSON.parse(doctor.patientFaq ?? '[]')
      if (Array.isArray(faqItems) && faqItems.length > 0) {
        faqText = faqItems
          .filter(f => f.question?.trim() && f.answer?.trim())
          .map(f => `P: ${f.question.trim()}\nR: ${f.answer.trim()}`)
          .join('\n\n')
      }
    } catch { /* ignore */ }

    // Build insurances summary
    let insurancesText = ''
    try {
      const ins: { name: string; active: boolean; requirements?: string }[] = JSON.parse(doctor.insurances ?? '[]')
      const active = ins.filter(i => i.active)
      if (active.length > 0) {
        insurancesText = active.map(i => `  - ${i.name}${i.requirements ? ` (${i.requirements})` : ''}`).join('\n')
      }
    } catch { /* ignore */ }

    const location = [doctor.canton, doctor.province].filter(Boolean).join(', ')

    const systemPrompt = `Eres el asistente virtual del consultorio de ${doctor.name}, especialista en ${doctor.specialty}.

Tu objetivo: responder preguntas sobre el médico/consultorio y ayudar a los pacientes interesados a agendar una cita, capturando su nombre y teléfono de forma natural.

INFORMACIÓN DEL CONSULTORIO:
- Médico: ${doctor.name}
- Especialidad: ${doctor.specialty}
${doctor.bio ? `- Descripción: ${doctor.bio}` : ''}
${location ? `- Ubicación: ${location}` : ''}
${doctor.address ? `- Dirección: ${doctor.address}` : ''}
${doctor.whatsapp ? `- WhatsApp para citas: ${doctor.whatsapp}` : ''}
${modesText ? `- Modalidades de atención: ${modesText}` : ''}
${scheduleLines.length > 0 ? `- Horario:\n${scheduleLines.join('\n')}` : ''}
${servicesText ? `- Servicios:\n${servicesText}` : ''}
${insurancesText ? `- Seguros/convenios aceptados:\n${insurancesText}` : '- Seguros/convenios: No se ha registrado información de seguros para este consultorio.'}

${faqText ? `\nPREGUNTAS FRECUENTES (responde exactamente así cuando el paciente pregunte algo similar):\n${faqText}` : ''}

PROCESO DE CAPTURA DE LEAD:
1. Responde cualquier pregunta sobre el médico, horarios, servicios y precios.
2. Cuando el paciente muestre interés en agendar, pregunta amablemente: "¿Cómo te llamas?"
3. Una vez que escriba su nombre real, pregunta: "¿Y tu número de WhatsApp para coordinar la cita?"
4. Cuando tengas nombre Y teléfono reales del paciente, incluye al FINAL de tu respuesta este marcador:
[LEAD:name=NOMBRE_REAL|phone=TELEFONO_REAL|message=MOTIVO_O_vacio]

REGLAS CRÍTICAS:
- Incluye el marcador SOLO cuando el paciente haya escrito su nombre y teléfono reales.
- NUNCA uses placeholders como "NOMBRE" o "no especificado" en el marcador.
- Respuestas breves y cálidas (2-4 frases).
- Habla siempre de ${doctor.name} en tercera persona ("el Dr./la Dra. ...").
- USA ÚNICAMENTE la información del consultorio proporcionada arriba. NUNCA inventes horarios, direcciones, precios ni ningún otro dato que no esté explícitamente indicado.
- Si te preguntan algo que no está en la información de arriba, responde: "No tengo ese dato disponible. Te recomiendo escribir al WhatsApp${doctor.whatsapp ? ` ${doctor.whatsapp}` : ' del consultorio'} para más información."
- NUNCA digas horarios, direcciones ni precios diferentes a los que aparecen arriba.
- NUNCA compartas el teléfono personal del médico. El único contacto que puedes dar es el WhatsApp business indicado arriba.
- NUNCA inventes información sobre seguros médicos o convenios. Si el paciente pregunta, usa ÚNICAMENTE los seguros listados arriba. Si no hay seguros registrados, di claramente que no tienes esa información disponible y que contacte al consultorio.${doctor.saraPatientInstructions ? `\n\nINSTRUCCIONES ADICIONALES DEL MÉDICO (seguir siempre):\n${doctor.saraPatientInstructions}` : ''}`

    const model = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat-v3-0324'

    const completion = await openai.chat.completions.create({
      model,
      max_tokens: 400,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10),
      ],
    })

    const text = completion.choices[0]?.message?.content ?? 'Lo siento, intenta de nuevo.'

    // If Sara couldn't answer, log the patient's question for the doctor
    if (text.includes('No tengo ese dato')) {
      const patientMsg = [...messages].reverse().find(m => m.role === 'user')?.content
      if (patientMsg) {
        prisma.saraUnansweredQuestion.create({
          data: { doctorId: doctor.id, question: patientMsg.trim(), source: 'public_chat' },
        }).catch(() => {/* non-critical */})
      }
    }

    return NextResponse.json({ text })
  } catch (err) {
    console.error('public-chat error:', err)
    return NextResponse.json({ text: 'Hubo un problema técnico. Por favor intenta de nuevo o contáctanos directamente.' })
  }
}
