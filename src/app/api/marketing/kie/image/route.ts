import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createImageTask, SARA_CREDIT_COSTS } from '@/lib/kie-ai'
import OpenAI from 'openai'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'

type BrandProfile = {
  clinicName: string | null
  specialties: string[]
  slogan: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  tones: string[]
  targetAudience: string | null
  logoUrl: string | null
}

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: {
      id: true,
      name: true,
      specialty: true,
      brandProfile: {
        select: {
          clinicName: true, specialties: true, slogan: true,
          primaryColor: true, secondaryColor: true, accentColor: true,
          tones: true, targetAudience: true, logoUrl: true,
        },
      },
    },
  })
  if (!doctor) return null
  return { doctor, isAdmin: user.email === SUPERADMIN_EMAIL }
}

async function enhanceImagePrompt(
  rawPrompt: string,
  brand: BrandProfile | null,
  doctorName: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return rawPrompt

  const brandBlock = brand
    ? `\n\nCONTEXTO DE MARCA:\n- Nombre: ${brand.clinicName ?? doctorName}\n- Especialidades: ${brand.specialties?.join(', ') || 'medicina general'}\n- Slogan: ${brand.slogan ?? 'ninguno'}\n- Colores de marca: primario ${brand.primaryColor}, secundario ${brand.secondaryColor}, acento ${brand.accentColor}\n- Tono de comunicación: ${brand.tones?.join(', ') || 'profesional'}\n- Audiencia objetivo: ${brand.targetAudience ?? 'pacientes en general'}\n- Logo disponible: ${brand.logoUrl ? 'sí' : 'no'}`
    : ''

  try {
    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site',
        'X-Title': 'MedSara KIE',
      },
    })
    const res = await client.chat.completions.create({
      model: 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `Eres un prompt engineer experto en generación de imágenes con IA (Flux, Midjourney, DALL-E).
Creas prompts en inglés, detallados y profesionales para contenido médico en redes sociales.
Incluye siempre: estilo visual, iluminación, composición, paleta de colores coherente con la marca, atmósfera.
Responde ÚNICAMENTE con el prompt mejorado en inglés, sin explicaciones ni texto adicional.`,
        },
        {
          role: 'user',
          content: `Transforma este prompt básico en un prompt profesional para generar una imagen médica para redes sociales:\n\n"${rawPrompt}"${brandBlock}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 400,
    })
    return res.choices[0]?.message?.content?.trim() ?? rawPrompt
  } catch {
    return rawPrompt
  }
}

export async function POST(req: Request) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { doctor, isAdmin } = auth
  const { prompt, aspectRatio = '1:1', socialPostId } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })

  const cost = SARA_CREDIT_COSTS.IMAGE

  // Regular doctor: check DB balance
  if (!isAdmin) {
    const credit = await prisma.doctorCredit.upsert({
      where: { doctorId: doctor.id },
      update: {},
      create: { doctorId: doctor.id, credits: 0 },
    })
    if (credit.credits < cost) {
      return NextResponse.json({ error: 'Créditos insuficientes', code: 'INSUFFICIENT_CREDITS' }, { status: 402 })
    }
  }

  try {
    const enhanced = await enhanceImagePrompt(prompt, doctor.brandProfile ?? null, doctor.name)
    const { taskId } = await createImageTask(enhanced, aspectRatio)

    if (!isAdmin) {
      await prisma.doctorCredit.update({
        where: { doctorId: doctor.id },
        data: { credits: { decrement: cost } },
      })
      await prisma.creditTransaction.create({
        data: {
          doctorId: doctor.id,
          type: 'IMAGE',
          credits: -cost,
          description: `Imagen IA generada (Flux-2 Pro)`,
          kieTaskId: taskId,
        },
      })
    }

    if (socialPostId) {
      await prisma.socialPost.update({
        where: { id: socialPostId },
        data: { imageUrl: null },
      }).catch(() => {})
    }

    return NextResponse.json({ taskId, creditCost: cost, newCredits: null })
  } catch (err) {
    console.error('KIE image error:', err)
    return NextResponse.json({ error: 'Error al iniciar la generación de imagen' }, { status: 500 })
  }
}
