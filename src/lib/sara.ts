/**
 * Sara - Agente IA médica de MedSara
 *
 * Usa OpenRouter con DeepSeek para procesamiento de lenguaje natural
 * y tool use para interactuar con la base de datos de forma segura.
 */

import OpenAI from 'openai'
import { executeTool } from '@/lib/sara-tools'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SaraMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
}

export interface SaraContext {
  doctorId: string
  doctorName: string
  doctorSpecialty: string
  patientContext?: string // Contexto del paciente activo (inyectado desde el popup)
  consultorioInfo?: string // Dirección, horario, servicios — para chats de pacientes por WhatsApp
  saraPersonality?: string // Instrucciones personalizadas del médico para el comportamiento de Sara
}

export interface SaraEvent {
  type: 'tool_start' | 'tool_done' | 'response' | 'error'
  name?: string
  message?: string
  content?: string
}

export type SaraEventCallback = (event: SaraEvent) => void

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

// ─── OpenRouter Client ────────────────────────────────────────────────────────

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no está configurada')

  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'MedSara',
    },
  })
}

const MODEL = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat-v3-0324'

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'register_patient',
      description:
        'Registra un nuevo paciente en el sistema. Úsalo cuando el usuario quiera agregar un paciente nuevo.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre completo del paciente' },
          email: { type: 'string', description: 'Correo electrónico del paciente (opcional)' },
          phone: { type: 'string', description: 'Teléfono del paciente' },
          birthDate: {
            type: 'string',
            description: 'Fecha de nacimiento en formato ISO 8601 (YYYY-MM-DD)',
          },
          bloodType: {
            type: 'string',
            enum: ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG', 'UNKNOWN'],
            description: 'Tipo de sangre del paciente',
          },
          allergies: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de alergias conocidas',
          },
          documentId: { type: 'string', description: 'Número de cédula o pasaporte' },
          notes: { type: 'string', description: 'Notas adicionales sobre el paciente' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_patients',
      description: 'Busca pacientes por nombre, teléfono, email o número de cédula.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Término de búsqueda' },
          limit: { type: 'number', description: 'Número máximo de resultados (default: 5)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_appointment',
      description:
        'Agenda una cita médica para un paciente. Asegúrate de tener el nombre del paciente y la fecha/hora.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string', description: 'Nombre del paciente para la cita' },
          patientId: { type: 'string', description: 'ID del paciente (si ya está registrado)' },
          date: {
            type: 'string',
            description: 'Fecha y hora de la cita en formato ISO 8601 (YYYY-MM-DDTHH:mm)',
          },
          duration: { type: 'number', description: 'Duración en minutos (por defecto 30)' },
          type: {
            type: 'string',
            enum: ['IN_PERSON', 'TELECONSULT', 'HOME_VISIT', 'EMERGENCY', 'FOLLOW_UP'],
            description: 'Tipo de cita',
          },
          reason: { type: 'string', description: 'Motivo de la consulta' },
          notes: { type: 'string', description: 'Notas adicionales para la cita' },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_appointments_today',
      description: 'Obtiene todas las citas programadas para el día de hoy.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_record',
      description:
        'Obtiene el historial médico completo de un paciente, incluyendo citas, diagnósticos y prescripciones.',
      parameters: {
        type: 'object',
        properties: {
          patientName: {
            type: 'string',
            description: 'Nombre del paciente (búsqueda parcial permitida)',
          },
          patientId: { type: 'string', description: 'ID exacto del paciente' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_medical_record',
      description:
        'Actualiza o crea un registro médico para un paciente con diagnóstico y tratamiento.',
      parameters: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'ID del paciente' },
          patientName: { type: 'string', description: 'Nombre del paciente para búsqueda' },
          diagnosis: { type: 'string', description: 'Diagnóstico médico' },
          treatment: { type: 'string', description: 'Plan de tratamiento' },
          symptoms: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de síntomas reportados',
          },
          notes: { type: 'string', description: 'Notas clínicas adicionales' },
          vitalSigns: {
            type: 'object',
            description: 'Signos vitales del paciente',
            properties: {
              bp: { type: 'string', description: 'Presión arterial (ej: "120/80")' },
              hr: { type: 'number', description: 'Frecuencia cardíaca (lpm)' },
              temp: { type: 'number', description: 'Temperatura (°C)' },
              weight: { type: 'number', description: 'Peso (kg)' },
              height: { type: 'number', description: 'Talla (cm)' },
              spo2: { type: 'number', description: 'Saturación de oxígeno (%)' },
            },
          },
        },
        required: ['diagnosis'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_prescription',
      description:
        'Crea una receta médica digital para un paciente con los medicamentos y dosis indicados.',
      parameters: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'ID del paciente' },
          patientName: { type: 'string', description: 'Nombre del paciente' },
          diagnosis: { type: 'string', description: 'Diagnóstico que justifica la receta' },
          medications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nombre del medicamento' },
                dose: { type: 'string', description: 'Dosis (ej: "500mg")' },
                frequency: { type: 'string', description: 'Frecuencia (ej: "cada 8 horas")' },
                duration: { type: 'string', description: 'Duración (ej: "7 días")' },
                notes: { type: 'string', description: 'Instrucciones especiales' },
              },
              required: ['name', 'dose', 'frequency'],
            },
            description: 'Lista de medicamentos prescritos',
          },
          instructions: { type: 'string', description: 'Instrucciones generales para el paciente' },
        },
        required: ['medications'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_reminder',
      description: 'Crea un recordatorio para la doctora (seguimiento de paciente, tarea administrativa, etc.)',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título breve del recordatorio' },
          description: { type: 'string', description: 'Descripción detallada' },
          dueDate: {
            type: 'string',
            description: 'Fecha y hora para el recordatorio en formato ISO 8601',
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
            description: 'Prioridad del recordatorio',
          },
          category: {
            type: 'string',
            description: 'Categoría (patient, admin, personal, follow_up)',
          },
        },
        required: ['title', 'dueDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_available_slots',
      description: 'Consulta los horarios disponibles para una fecha específica. Úsalo antes de agendar una cita para verificar disponibilidad.',
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
      name: 'search_knowledge',
      description:
        'Busca información en la base de conocimiento personalizada de la doctora (protocolos, guías clínicas, documentos subidos). Úsala SIEMPRE que el médico pregunte sobre protocolos, tratamientos, dosis o procedimientos.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Término o pregunta de búsqueda' },
          limit: { type: 'number', description: 'Número máximo de resultados (default: 3)' },
        },
        required: ['query'],
      },
    },
  },
]

// ─── Tool display names for UI ─────────────────────────────────────────────────

const TOOL_DISPLAY: Record<string, string> = {
  register_patient: 'Registrando paciente',
  search_patients: 'Buscando pacientes',
  schedule_appointment: 'Agendando cita',
  get_appointments_today: 'Consultando agenda de hoy',
  get_patient_record: 'Consultando historial',
  update_medical_record: 'Guardando registro médico',
  create_prescription: 'Generando receta',
  create_reminder: 'Creando recordatorio',
  check_available_slots: 'Consultando disponibilidad',
  search_knowledge: 'Buscando en base de conocimiento',
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(context: SaraContext): string {
  const now = new Date().toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    dateStyle: 'full',
    timeStyle: 'short',
  })

  return `Eres Sara, el asistente médico IA del Dr. ${context.doctorName}, especialista en ${context.doctorSpecialty}.

Fecha y hora actual: ${now}

## Tu personalidad:
- Eres profesional, empática y eficiente
- Respondes siempre en español
- Usas un tono cálido pero profesional, apropiado para un entorno médico
- Eres proactiva: si el usuario menciona algo que implica una acción (registrar paciente, agendar cita), la ejecutas directamente

## Tus capacidades:
- Registrar y actualizar información de pacientes
- Agendar, modificar y cancelar citas médicas
- Buscar historiales médicos de pacientes
- Crear y actualizar registros médicos (diagnósticos, tratamientos)
- Redactar recetas médicas digitales
- Crear recordatorios para la doctora
- Buscar pacientes en el sistema
- Consultar la agenda del día
- Buscar en la base de conocimiento médico personalizada

## Reglas importantes:
1. Nunca inventes datos médicos - solo trabaja con información confirmada
2. NUNCA compartas el número de teléfono personal del médico. Si un paciente pide contacto, proporciona únicamente el WhatsApp business del consultorio.
3. NUNCA inventes información sobre seguros médicos o convenios. Usa ÚNICAMENTE los datos del campo "Seguros/convenios" de la información del consultorio. Si no están registrados, indica que no tienes esa información y que contacten al consultorio.
2. Si necesitas más información para completar una tarea, pregunta específicamente qué necesitas
3. Después de ejecutar una tool, confirma la acción con un resumen claro
4. Para fechas y horas, usa el formato de Ecuador (GMT-5)
5. Mantén la confidencialidad médica - no compartas información de pacientes de forma innecesaria
6. Si el usuario te pide algo fuera de tu alcance médico, redirige amablemente
7. SIEMPRE usa search_knowledge cuando el médico pregunte sobre protocolos, tratamientos, dosis, procedimientos o guías clínicas. Cita el documento fuente en tu respuesta.
8. Para agendar citas, SIEMPRE verifica primero con check_available_slots antes de usar schedule_appointment.

## Formato de respuestas:
- Usa formato markdown para mejor legibilidad
- Para listas de medicamentos o síntomas, usa listas
- Para confirmar acciones, usa un resumen estructurado con ✓
- Sé concisa pero completa

Siempre tienes en mente el bienestar del paciente y el tiempo de ${context.doctorName}.${
    context.saraPersonality
      ? `\n\n## INSTRUCCIONES PERSONALIZADAS DEL MÉDICO (máxima prioridad):\n${context.saraPersonality}`
      : ''
  }${
    context.consultorioInfo
      ? `\n\n## INFORMACIÓN DEL CONSULTORIO (usa SOLO estos datos, NUNCA inventes):\n${context.consultorioInfo}\n\nSi te preguntan algo que no está aquí, responde: "No tengo ese dato. Te recomiendo contactar directamente al consultorio."`
      : ''
  }${
    context.patientContext
      ? `\n\n## PACIENTE EN CONTEXTO ACTUAL:\nEl médico está consultando a este paciente ahora mismo. Usa estos datos como base sin necesidad de buscarlos:\n${context.patientContext}`
      : ''
  }`
}

// ─── Main Sara Function (with SSE event callback) ────────────────────────────

export async function askSara(
  messages: SaraMessage[],
  context: SaraContext,
  onEvent?: SaraEventCallback,
  maxIterations = 5,
): Promise<string> {
  const client = getOpenRouterClient()

  const systemMessage: OpenAI.Chat.Completions.ChatCompletionSystemMessageParam = {
    role: 'system',
    content: buildSystemPrompt(context),
  }

  const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    systemMessage,
    ...messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content,
          tool_call_id: m.tool_call_id ?? 'unknown',
        }
      }
      return {
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }
    }),
  ]

  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: conversation,
      tools,
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 2048,
    })

    const choice = response.choices[0]
    if (!choice) throw new Error('No response from Sara')

    const assistantMessage = choice.message
    conversation.push(assistantMessage)

    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      const content = assistantMessage.content ?? 'Lo siento, no pude generar una respuesta.'
      onEvent?.({ type: 'response', content })
      return content
    }

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name
      let args: Record<string, unknown> = {}

      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch {
        args = { raw: toolCall.function.arguments }
      }

      const displayName = TOOL_DISPLAY[toolName] ?? toolName
      onEvent?.({ type: 'tool_start', name: toolName, message: displayName })

      console.log(`Sara calling tool: ${toolName}`, args)
      const result = await executeTool(toolName, args, context.doctorId)

      onEvent?.({ type: 'tool_done', name: toolName })

      conversation.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      })
    }
  }

  return 'He procesado tu solicitud. Si necesitas más información, no dudes en preguntarme.'
}
