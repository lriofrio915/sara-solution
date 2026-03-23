/**
 * GET /api/marketing/specialty-topics
 * Returns 8 medical topic suggestions tailored to the doctor's specialty
 * for use as LinkedIn post quick-starters.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada')
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site',
      'X-Title': 'MedSara Specialty Topics',
    },
  })
}

const FOCUS_ANGLES = [
  'enfermedades frecuentes y su manejo',
  'prevención y hábitos saludables',
  'síntomas de alerta que no se deben ignorar',
  'mitos y verdades sobre tratamientos',
  'innovaciones y avances recientes',
  'consejos prácticos para el día a día',
  'cuándo consultar al especialista',
  'impacto emocional y calidad de vida',
]

const PLATFORM_CONTEXT: Record<string, string> = {
  linkedin: 'artículos y posts educativos en LinkedIn para posicionarse como referente médico y atraer pacientes profesionales',
  instagram: 'contenido visual y atractivo en Instagram para generar engagement, mostrar expertise y conectar emocionalmente con pacientes',
  facebook: 'publicaciones educativas y compartibles en Facebook para construir comunidad, generar confianza y fidelizar pacientes',
  tiktok: 'videos cortos virales en TikTok con datos sorprendentes, ganchos impactantes o mitos médicos populares para desmentir',
}

const PLATFORM_FORMAT: Record<string, string> = {
  linkedin: 'post profesional de LinkedIn',
  instagram: 'post visual de Instagram',
  facebook: 'publicación de Facebook',
  tiktok: 'video corto de TikTok',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') || 'linkedin'

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctorRef = await getDoctorFromUser(user)
    if (!doctorRef) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorRef.id },
      select: { specialty: true, bio: true },
    })

    const specialty = doctor?.specialty?.trim() || 'Medicina General'
    const bio = doctor?.bio?.trim() || ''

    // Pick a random focus angle and a nonce to bust OpenRouter prompt cache
    const angle = FOCUS_ANGLES[Math.floor(Math.random() * FOCUS_ANGLES.length)]
    const nonce = Math.random().toString(36).slice(2, 8)

    const platformDesc = PLATFORM_CONTEXT[platform] || PLATFORM_CONTEXT.linkedin
    const formatDesc = PLATFORM_FORMAT[platform] || PLATFORM_FORMAT.linkedin

    const client = getClient()

    const prompt = `Eres un experto en marketing médico. Un médico con la especialidad "${specialty}" ${bio ? `que se describe así: "${bio.slice(0, 300)}"` : ''} quiere publicar ${platformDesc}. [ref:${nonce}]

Genera exactamente 8 temas DISTINTOS enfocados en: ${angle}. Cada tema debe:
- Ser específico a su especialidad médica
- Ser educativo, preventivo o informativo para pacientes
- Redactarse como título corto de ${formatDesc} (máximo 6 palabras)

Responde ÚNICAMENTE con un JSON array de 8 strings, sin explicaciones. Ejemplo de formato:
["Prevención del infarto en mujeres","Hipertensión: síntomas silenciosos","Cuándo ver al cardiólogo","Diabetes tipo 2 y corazón","Arritmia: mitos y realidades","Colesterol bueno vs malo","Ejercicio y salud cardiovascular","Estrés y presión arterial"]`

    const completion = await client.chat.completions.create({
      model: 'anthropic/claude-haiku-4-5',
      max_tokens: 600,
      temperature: 0.9,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? '[]'

    // Extract JSON array from the response
    const match = raw.match(/\[[\s\S]*\]/)
    const topics: string[] = match ? JSON.parse(match[0]) : []

    return NextResponse.json({ topics, specialty })
  } catch (err) {
    console.error('GET /api/marketing/specialty-topics:', err)
    return NextResponse.json({ error: 'Error al generar sugerencias' }, { status: 500 })
  }
}
