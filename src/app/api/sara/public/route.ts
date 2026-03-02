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
      name: 'get_availability',
      description: 'Consulta los horarios de atención y disponibilidad del médico.',
      parameters: { type: 'object', properties: {}, required: [] },
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
        'Agenda una cita para el paciente. Requiere tener el patientId de un registro previo o usar patientName.',
      parameters: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'ID del paciente (si ya está registrado)' },
          patientName: { type: 'string', description: 'Nombre del paciente para búsqueda' },
          date: { type: 'string', description: 'Fecha y hora en formato ISO 8601 (YYYY-MM-DDTHH:mm)' },
          duration: { type: 'number', description: 'Duración en minutos (por defecto 30)' },
          type: {
            type: 'string',
            enum: ['IN_PERSON', 'TELECONSULT', 'HOME_VISIT'],
            description: 'Tipo de cita',
          },
          reason: { type: 'string', description: 'Motivo de la consulta' },
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
}

function executePublicTool(
  toolName: string,
  args: Record<string, unknown>,
  doctorId: string,
  doctor: DoctorData,
): Promise<unknown> {
  switch (toolName) {
    case 'get_doctor_info':
      return Promise.resolve({
        success: true,
        data: {
          name: doctor.name,
          specialty: doctor.specialty,
          bio: doctor.bio ?? 'Información no disponible.',
          address: doctor.address ?? 'Consultar por teléfono.',
          phone: doctor.phone ?? doctor.whatsapp ?? 'No disponible',
          whatsapp: doctor.whatsapp,
          services: doctor.services
            ? doctor.services.split('\n').filter(Boolean)
            : [],
        },
      })

    case 'get_availability':
      return Promise.resolve({
        success: true,
        data: {
          schedules: doctor.schedules ?? 'Horarios no configurados. Por favor comuníquese con el consultorio para más información.',
          message: 'Para agendar una cita, proporciona tu nombre, teléfono y el horario de tu preferencia.',
        },
      })

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

  return `Eres Sara, la asistente virtual del consultorio de ${doctor.name}, especialista en ${doctor.specialty}.

Fecha y hora actual: ${now}

## Tu rol:
Eres la asistente de recepción digital del consultorio. Tu objetivo es ayudar a los pacientes a:
1. Conocer información del consultorio (horarios, dirección, servicios)
2. Registrarse como pacientes
3. Agendar una cita médica

## Reglas ESTRICTAS:
- SOLO puedes usar las herramientas disponibles: get_doctor_info, get_availability, register_patient, schedule_appointment
- NO tienes acceso a historiales médicos, recetas ni información privada de otros pacientes
- NO des consejos médicos ni diagnósticos
- Si alguien pregunta por información médica, dile que debe consultar directamente con ${doctor.name.split(' ')[0]}
- Para emergencias médicas, indica siempre llamar al 911

## Flujo para agendar una cita:
1. Pregunta el nombre completo del paciente
2. Pregunta teléfono de contacto y motivo de consulta
3. Registra al paciente con register_patient
4. Pregunta qué fecha y hora prefiere
5. Confirma la disponibilidad con get_availability si es necesario
6. Agenda la cita con schedule_appointment

## Personalidad:
- Amable, profesional y eficiente
- Responde siempre en español
- Usa un tono cálido y accesible
- Sé concisa — los pacientes prefieren respuestas cortas y claras

Recuerda: estás representando al consultorio de ${doctor.name}.`
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

    // Agentic loop (max 4 iterations)
    let finalContent = ''
    const MAX_ITER = 4

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

      // Execute tool calls
      for (const toolCall of assistantMsg.tool_calls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(toolCall.function.arguments)
        } catch {
          args = {}
        }

        const result = await executePublicTool(
          toolCall.function.name,
          args,
          doctor.id,
          doctor,
        )

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
