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

export async function GET() {
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

    const client = getClient()

    const prompt = `Eres un experto en marketing médico. Un médico con la especialidad "${specialty}" ${bio ? `que se describe así: "${bio.slice(0, 300)}"` : ''} quiere publicar contenido educativo en LinkedIn para atraer y fidelizar pacientes.

Genera exactamente 8 temas concisos y relevantes para sus publicaciones. Cada tema debe:
- Ser específico a su especialidad médica
- Ser educativo, preventivo o informativo para pacientes
- Redactarse como título corto de post (máximo 6 palabras)
- Cubrir: enfermedades frecuentes, tratamientos, prevención, síntomas, mitos, recomendaciones

Responde ÚNICAMENTE con un JSON array de 8 strings, sin explicaciones. Ejemplo de formato:
["Prevención del infarto en mujeres","Hipertensión: síntomas silenciosos","Cuándo ver al cardiólogo","Diabetes tipo 2 y corazón","Arritmia: mitos y realidades","Colesterol bueno vs malo","Ejercicio y salud cardiovascular","Estrés y presión arterial"]`

    const completion = await client.chat.completions.create({
      model: 'anthropic/claude-haiku-4-5',
      max_tokens: 600,
      temperature: 0.7,
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
