import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { executeTool } from '@/lib/sara-tools'

// POST /api/sara/public
// Body: { messages: {role, content}[], slug: string }
// No authentication required — restricted tool set for patient-facing chat

const MODEL = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat-v3-0324'

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada')
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'MedSara Public',
    },
  })
}

// ─── Public tool definitions ─────────────────────────────────────────────────

const PUBLIC_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_doctor_info',
      description: 'Obtiene información del médico: nombre, especialidad, dirección, teléfono y bio.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_available_slots',
      description:
        'Consulta los horarios DISPONIBLES del médico para una fecha específica. DEBES llamar esta herramienta SIEMPRE antes de agendar una cita para confirmar disponibilidad real.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'register_patient',
      description:
        'Registra un nuevo paciente. Úsalo antes de agendar una cita si el paciente no tiene registro previo.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre completo del paciente' },
          email: { type: 'string', description: 'Correo electrónico (opcional)' },
          phone: { type: 'string', description: 'Teléfono de contacto' },
          birthDate: { type: 'string', description: 'Fecha de nacimiento YYYY-MM-DD (opcional)' },
          notes: { type: 'string', description: 'Motivo de consulta u otras notas' },
          insurance: { type: 'string', description: 'Tipo de seguro médico del paciente (IESS, Seguro privado, Particular, etc.)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_appointment',
      description:
        'Agenda una cita para el paciente. SOLO usar después de confirmar disponibilidad con check_available_slots.',
      parameters: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'ID del paciente (si ya está registrado)' },
          patientName: { type: 'string', description: 'Nombre del paciente para búsqueda' },
          date: { type: 'string', description: 'Fecha y hora exacta del slot disponible en formato ISO 8601 (YYYY-MM-DDTHH:mm)' },
          type: {
            type: 'string',
            enum: ['IN_PERSON', 'TELECONSULT', 'HOME_VISIT'],
            description: 'Tipo de cita',
          },
          reason: { type: 'string', description: 'Motivo de la consulta' },
          location: { type: 'string', description: 'Dirección del centro de atención (obtenida de check_available_slots)' },
        },
        required: ['date'],
      },
    },
  },
]

// ─── Public tool executor ─────────────────────────────────────────────────────

type DoctorData = {
  name: string
  specialty: string
  bio: string | null
  address: string | null
  phone: string | null
  whatsapp: string | null
  schedules: string | null
  services: string | null
  branches: string | null
}

function executePublicTool(
  toolName: string,
  args: Record<string, unknown>,
  doctorId: string,
  doctor: DoctorData,
): Promise<unknown> {
  switch (toolName) {
    case 'get_doctor_info': {
      let branches: { name: string; address: string }[] = []
      try { branches = doctor.branches ? JSON.parse(doctor.branches) : [] } catch { /* ignore */ }
      const locations = [
        ...(doctor.address ? [{ name: 'Consultorio principal', address: doctor.address }] : []),
        ...branches,
      ]
      return Promise.resolve({
        success: true,
        data: {
          name: doctor.name,
          specialty: doctor.specialty,
          bio: doctor.bio ?? 'Información no disponible.',
          address: locations.length === 1
            ? locations[0].address
            : locations.length > 1
              ? `Múltiples centros (la ubicación depende del día elegido)`
              : 'Consultar por teléfono.',
          locations,
          phone: doctor.phone ?? doctor.whatsapp ?? 'No disponible',
          whatsapp: doctor.whatsapp,
          services: (() => {
            if (!doctor.services) return []
            try {
              const parsed = JSON.parse(doctor.services)
              return Array.isArray(parsed)
                ? parsed.map((s: { name?: string; description?: string; price?: string; emoji?: string }) =>
                    `${s.emoji ?? ''} ${s.name ?? ''}${s.price ? ` ($${s.price})` : ''}${s.description ? ` — ${s.description}` : ''}`.trim()
                  ).filter(Boolean)
                : doctor.services.split('\n').filter(Boolean)
            } catch {
              return doctor.services.split('\n').filter(Boolean)
            }
          })(),
        },
      })
    }

    case 'check_available_slots':
    case 'register_patient':
    case 'schedule_appointment':
      return executeTool(toolName, args, doctorId)

    default:
      return Promise.resolve({ success: false, error: `Herramienta no disponible: ${toolName}` })
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildPublicSystemPrompt(doctor: DoctorData): string {
  const now = new Date().toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    dateStyle: 'full',
    timeStyle: 'short',
  })

  return `Eres la asistente virtual de recepción del consultorio de ${doctor.name}, especialista en ${doctor.specialty}.

Fecha y hora actual (Ecuador): ${now}

## Tu único objetivo:
Ayudar al paciente a agendar una cita médica de forma rápida y efectiva.

## Herramientas disponibles:
- get_doctor_info: información del consultorio (dirección, teléfono, **servicios y precios**). Llámala SIEMPRE que el paciente pregunte por servicios, precios o información del consultorio. NUNCA inventes servicios ni precios.
- check_available_slots: horarios disponibles para una fecha (SIEMPRE úsalo antes de agendar)
- register_patient: registrar al paciente
- schedule_appointment: crear la cita (SOLO con un slot confirmado como disponible)

## Flujo OBLIGATORIO para agendar una cita:
1. Saluda brevemente y pregunta nombre completo y teléfono
2. Pregunta motivo de consulta
2b. Pregunta si el paciente tiene seguro médico y qué tipo (IESS, seguro privado, particular, etc.)
3. Llama register_patient con los datos del paciente
4. Pregunta qué fecha prefiere
5. Llama check_available_slots(date) → muestra los horarios libres al paciente. Si la respuesta incluye "location", infórmale al paciente el centro donde será atendido ese día (no lo preguntes, es fijo según el día)
6. El paciente elige un horario → llama schedule_appointment con el slot exacto (formato ISO: YYYY-MM-DDTHH:mm) y la location si existe
7. SOLO después de recibir { success: true } de schedule_appointment, confirma la cita al paciente con fecha, hora y dirección

## Reglas CRÍTICAS — LEE CON ATENCIÓN:
- NUNCA confirmes una cita sin haber recibido { success: true } de schedule_appointment
- Si schedule_appointment devuelve error, comunícaselo al paciente y ofrece otro horario
- NUNCA inventes horarios disponibles — SIEMPRE usa check_available_slots primero
- NUNCA inventes servicios ni precios — SIEMPRE usa get_doctor_info y responde con los datos exactos que devuelva
- NUNCA registres ni confirmes datos que no te haya dado el paciente explícitamente
- Si una herramienta devuelve error, infórmalo honestamente y busca alternativa
- NUNCA des consejos médicos ni diagnósticos
- Para emergencias indica siempre llamar al 911
- Responde siempre en español, de forma breve y cordial

Representas al consultorio de ${doctor.name}. Sé profesional, cálida y eficiente.`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, slug } = body as {
      messages?: Array<{ role: string; content: string }>
      slug?: string
    }

    if (!slug) {
      return NextResponse.json({ error: 'slug es requerido' }, { status: 400 })
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages es requerido' }, { status: 400 })
    }

    // Find doctor by slug
    const doctor = await prisma.doctor.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        specialty: true,
        bio: true,
        address: true,
        phone: true,
        whatsapp: true,
        schedules: true,
        services: true,
        branches: true,
        active: true,
      },
    })

    if (!doctor || !doctor.active) {
      return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
    }

    const client = getOpenRouterClient()

    const systemMessage: OpenAI.Chat.Completions.ChatCompletionSystemMessageParam = {
      role: 'system',
      content: buildPublicSystemPrompt(doctor),
    }

    const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      systemMessage,
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ]

    // Agentic loop (max 6 iterations — check_slots + register + schedule + confirm)
    let finalContent = ''
    const MAX_ITER = 6

    for (let i = 0; i < MAX_ITER; i++) {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages: conversation,
        tools: PUBLIC_TOOLS,
        tool_choice: 'auto',
        temperature: 0.4,
        max_tokens: 1024,
      })

      const choice = response.choices[0]
      if (!choice) break

      const assistantMsg = choice.message
      conversation.push(assistantMsg)

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        finalContent = assistantMsg.content ?? 'Lo siento, no pude generar una respuesta.'
        break
      }

      // Execute tool calls — each wrapped so one failure doesn't kill the conversation
      for (const toolCall of assistantMsg.tool_calls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(toolCall.function.arguments)
        } catch {
          args = {}
        }

        let result: unknown
        try {
          result = await executePublicTool(toolCall.function.name, args, doctor.id, doctor)
          console.log(`[Sara:${slug}] tool ${toolCall.function.name} → success`)
        } catch (toolErr) {
          const msg = toolErr instanceof Error ? toolErr.message : 'Error interno al ejecutar la herramienta'
          console.error(`[Sara:${slug}] tool ${toolCall.function.name} ERROR:`, msg)
          result = { success: false, error: msg }
        }

        conversation.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        })
      }
    }

    if (!finalContent) {
      finalContent = 'Lo siento, no pude procesar tu solicitud. Por favor intenta de nuevo.'
    }

    return NextResponse.json({ content: finalContent })
  } catch (error) {
    console.error('Public Sara error:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
