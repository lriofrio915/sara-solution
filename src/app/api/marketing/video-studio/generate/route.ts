import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 60

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
}

const SYSTEM_PROMPT = `Eres un editor de video profesional especializado en contenido para nutricionistas y profesionales de salud. Tu trabajo es analizar la descripción de un video y generar los parámetros exactos para crear una composición de video animada profesional.

Tienes 3 templates disponibles:
- "talking_head": Para videos de persona hablando a cámara. Muestra el video de fondo con overlays de texto, lower third con nombre/cargo, y CTA al final.
- "announcement": Para anuncios y promociones. Fondo de color con texto grande animado, partículas decorativas, y CTA. Ideal cuando no hay video de fondo.
- "testimonial": Para testimonios y citas. Estilo editorial con quote grande, autor con credenciales, y CTA.

Analiza la descripción y elige el template más apropiado. Genera copy conciso y profesional en español.

RESPONDE SOLO con JSON válido, sin markdown, sin texto adicional. Usa exactamente esta estructura:

{
  "template": "talking_head | announcement | testimonial",
  "title": "texto principal del video (máx 8 palabras, impactante)",
  "subtitle": "texto secundario o null (máx 12 palabras)",
  "lowerThird": { "name": "nombre del profesional", "role": "cargo/especialidad" } | null,
  "cta": "llamada a la acción corta o null (máx 5 palabras)",
  "ctaAt": number (segundo en que aparece el CTA, ej: 20 para video de 30s),
  "primaryColor": "#4A7C59",
  "bgColor": "#FAFAF8",
  "textColor": "#1A1F1C",
  "duration": number (duración en segundos),
  "fps": 30,
  "platform": "tiktok | instagram | youtube | presentacion",
  "videoUrl": "url del video o null",
  "escenas": [
    {
      "numero": 1,
      "inicio": 0,
      "fin": number,
      "descripcion": "descripción de lo que ocurre en esta escena"
    }
  ],
  "notas": "observaciones adicionales sobre el estilo y edición"
}`

export async function POST(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { videoUrl, platform, duration, style, description } = body

  if (!description?.trim()) {
    return NextResponse.json({ error: 'description es requerido' }, { status: 400 })
  }

  const platformLabels: Record<string, string> = {
    tiktok: 'TikTok / Reel (vertical 9:16)',
    instagram: 'Instagram Feed (cuadrado 1:1)',
    youtube: 'YouTube (horizontal 16:9)',
    presentacion: 'Presentación (horizontal 16:9)',
  }

  const styleLabels: Record<string, string> = {
    dinamico: 'dinámico y energético con cortes rápidos',
    minimalista: 'minimalista, limpio, mucho espacio',
    profesional: 'profesional y corporativo, inspira confianza',
    educativo: 'educativo e informativo, claro y didáctico',
  }

  const userMessage = `Genera los parámetros para este video:

Descripción: ${description}

Plataforma: ${platformLabels[platform] ?? platform}
Duración objetivo: ${duration} segundos
Estilo visual: ${styleLabels[style] ?? style}
${videoUrl ? `Video crudo disponible en: ${videoUrl}` : 'No hay video de fondo — usar template sin video.'}

Genera los parámetros JSON. Si hay video disponible, usa "talking_head" como template preferido y pon la videoUrl en el JSON. Si no hay video, usa "announcement". Adapta el copy al dominio de nutrición clínica.`

  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat-v3-0324'

  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY no configurada' }, { status: 500 })
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.65,
      max_tokens: 1200,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: `Error de IA: ${err}` }, { status: 500 })
  }

  const aiData = await response.json()
  const raw = aiData.choices?.[0]?.message?.content ?? '{}'

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'La IA devolvió una respuesta inválida. Intenta de nuevo.' }, { status: 500 })
  }

  // Ensure required fields have defaults
  parsed.fps = parsed.fps ?? 30
  parsed.primaryColor = parsed.primaryColor ?? '#4A7C59'
  parsed.bgColor = parsed.bgColor ?? '#FAFAF8'
  parsed.textColor = parsed.textColor ?? '#1A1F1C'
  parsed.duration = parsed.duration ?? duration ?? 30
  parsed.platform = parsed.platform ?? platform ?? 'tiktok'
  parsed.videoUrl = parsed.videoUrl ?? videoUrl ?? null

  return NextResponse.json(parsed)
}
