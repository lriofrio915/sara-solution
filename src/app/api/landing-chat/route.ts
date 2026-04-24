/**
 * POST /api/landing-chat
 * Public endpoint — no auth required.
 * Powers the Sara AI chat widget on the landing page for lead capture.
 */
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { parseBody } from '@/lib/validation/parseBody'
import { ChatBodySchema } from '@/lib/validation/schemas/chat'

export const dynamic = 'force-dynamic'

function getOpenAI() {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'HTTP-Referer': 'https://consultorio.site',
      'X-Title': 'Sara Medical Landing Chat',
    },
  })
}

const SYSTEM_PROMPT = `Eres Sara, la asistente IA de Sara Medical — el software de gestión médica con inteligencia artificial para médicos en Ecuador y Latinoamérica.

INFORMACIÓN SOBRE SARA MEDICAL:
- Software de gestión de consultorio con IA para médicos independientes y clínicas
- Funcionalidades: Agenda inteligente, fichas médicas digitales, recetas y CIE-10, certificados médicos, órdenes de examen, historia clínica completa
- Agente Sara IA en WhatsApp Business: atiende pacientes, agenda citas y responde dudas 24/7 de forma automática
- Marketing Suite con IA: genera contenido y diseños para Instagram, Facebook y TikTok
- Página web de consultorio profesional incluida (vitrina del médico)
- Multi-sede y multi-médico (plan Enterprise)

PLANES Y PRECIOS (precio de lanzamiento con 70% de descuento):
- Pro Mensual: $24/mes (precio regular $79) — Todo incluido, sin límite de pacientes
- Pro Anual: $195/año ($16/mes) (precio regular $649) — Ahorra $93 vs pago mensual, mejor opción
- Enterprise: $60/mes (precio regular $199) — Hasta 5 médicos, multi-sede, white label

PROCESO DE CAPTURA — SIGUE ESTE ORDEN ESTRICTAMENTE:
1. Responde la pregunta del médico con información útil sobre Sara Medical.
2. Cuando muestre interés, haz UNA sola pregunta: "¿Cómo te llamas?" y espera su respuesta.
3. Una vez que el usuario haya escrito su nombre real en un mensaje, pide su WhatsApp: "¿Y tu número de WhatsApp?"
4. Una vez que el usuario haya escrito su teléfono real, añade el marcador al final de tu respuesta.

REGLA CRÍTICA SOBRE EL MARCADOR:
- Incluye el marcador [LEAD:...] ÚNICAMENTE cuando el usuario haya escrito explícitamente su nombre Y su teléfono en mensajes anteriores.
- Usa EXACTAMENTE los valores que el usuario escribió, sin modificarlos ni reemplazarlos.
- NUNCA uses valores inventados, placeholders ni "no especificado" en name o phone.
- Si aún no tienes nombre o teléfono real del usuario, NO incluyas el marcador. Espera a tenerlos.

Formato del marcador (solo cuando tengas datos reales):
[LEAD:name=NOMBRE_REAL_DEL_USUARIO|phone=TELEFONO_REAL_DEL_USUARIO|specialty=ESPECIALIDAD_O_desconocida]

REGLAS:
- Siempre en español, tono cálido y profesional
- Respuestas breves (3-5 frases máx)
- Usa emojis ocasionalmente (🩺 💡 ✅ 📅)
- No presiones, sé consultivo
- Si preguntan por el precio, sé transparente y menciona el plan anual como mejor opción
- Nunca inventes funcionalidades que no existen`

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, ChatBodySchema)
  if (!parsed.ok) return parsed.response
  const messages = parsed.data.messages as ChatMessage[]

  try {
    const model = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat-v3-0324'

    const completion = await getOpenAI().chat.completions.create({
      model,
      max_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-10), // last 10 messages for context
      ],
    })

    const text = completion.choices[0]?.message?.content ?? 'Lo siento, intenta de nuevo.'

    return NextResponse.json({ text })
  } catch (err) {
    console.error('landing-chat error:', err)
    return NextResponse.json(
      { text: 'Hubo un problema técnico. Puedes escribirnos directamente al WhatsApp +593 996 691 586 y te atendemos de inmediato 😊' },
      { status: 200 }
    )
  }
}
