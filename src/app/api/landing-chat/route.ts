/**
 * POST /api/landing-chat
 * Public endpoint — no auth required.
 * Powers the Sara AI chat widget on the landing page for lead capture.
 */
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://consultorio.site',
    'X-Title': 'Sara Medical Landing Chat',
  },
})

const SYSTEM_PROMPT = `Eres Sara, la asistente IA de Sara Medical — el software de gestión médica con inteligencia artificial para médicos en Ecuador y Latinoamérica.

INFORMACIÓN SOBRE SARA MEDICAL:
- Software de gestión de consultorio con IA para médicos independientes y clínicas
- Funcionalidades: Agenda inteligente, fichas médicas digitales, recetas y CIE-10, certificados médicos, órdenes de examen, historia clínica completa
- Agente Sara IA en WhatsApp Business: atiende pacientes, agenda citas y responde dudas 24/7 de forma automática
- Marketing Suite con IA: genera contenido y diseños para Instagram, Facebook y TikTok
- Página web de consultorio profesional incluida (vitrina del médico)
- Multi-sede y multi-médico (plan Enterprise)

PLANES Y PRECIOS:
- Pro Mensual: $79/mes — Todo incluido, sin límite de pacientes
- Pro Anual: $645/año ($53.75/mes) — Ahorra $303 vs pago mensual, mejor opción
- Enterprise: $199/mes — Hasta 5 médicos, multi-sede, white label

PROCESO DE CAPTURA:
Tu meta principal es responder las preguntas del médico con información valiosa sobre Sara Medical y, de forma natural, obtener sus datos para coordinar una demo gratuita.

Sigue este flujo:
1. Responde con entusiasmo y precisión cualquier pregunta sobre el software
2. Cuando el médico muestre interés real, pregunta amablemente: "¿Me das tu nombre para personalizarte la demo?"
3. Luego pide: "¿Y tu número de WhatsApp para coordinarnos?"
4. Si no mencionó especialidad, pregunta cuál es

CUANDO TENGAS nombre + teléfono (la especialidad es opcional), incluye al FINAL de tu respuesta este marcador exacto (sin espacios extra):
[LEAD:name=NOMBRE|phone=TELEFONO|specialty=ESPECIALIDAD]

Si no tienes especialidad, escribe specialty=no especificada

REGLAS:
- Siempre en español, tono cálido y profesional
- Respuestas breves (3-5 frases máx)
- Usa emojis ocasionalmente (🩺 💡 ✅ 📅)
- No presiones, sé consultivo
- Si preguntan por el precio, sé transparente y menciona el plan anual como mejor opción
- Nunca inventes funcionalidades que no existen`

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as { messages: ChatMessage[] }

    const model = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat-v3-0324'

    const completion = await openai.chat.completions.create({
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
