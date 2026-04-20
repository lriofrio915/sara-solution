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

const STYLE_DESCRIPTIONS: Record<string, string> = {
  fotorrealista: 'photorealistic, professional photography, studio lighting, sharp focus, high resolution',
  minimalista: 'minimalist flat design, clean white background, simple geometric shapes, elegant spacing',
  ilustracion: 'digital illustration, flat vector art, vibrant colors, modern graphic design',
  acuarela: 'soft watercolor illustration, pastel tones, delicate brushstrokes, medical art style',
  corporativo: 'corporate photography style, professional, sharp, high contrast, business setting',
}

async function enhanceImagePrompt(
  rawPrompt: string,
  brand: BrandProfile | null,
  doctorName: string,
  styleKey?: string,
  styleAnchor?: string,
  overlayText?: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return rawPrompt

  const brandBlock = brand
    ? `\n\nCONTEXTO DE MARCA:\n- Nombre: ${brand.clinicName ?? doctorName}\n- Especialidades: ${brand.specialties?.join(', ') || 'medicina general'}\n- Slogan: ${brand.slogan ?? 'ninguno'}\n- Colores de marca: primario ${brand.primaryColor}, secundario ${brand.secondaryColor}, acento ${brand.accentColor}\n- Tono de comunicación: ${brand.tones?.join(', ') || 'profesional'}\n- Audiencia objetivo: ${brand.targetAudience ?? 'pacientes en general'}\n- Logo disponible: ${brand.logoUrl ? 'sí' : 'no'}`
    : ''

  const styleDesc = styleKey ? STYLE_DESCRIPTIONS[styleKey] : undefined
  const styleBlock = styleDesc ? `\n\nESTILO VISUAL REQUERIDO: ${styleDesc}` : ''
  const anchorBlock = styleAnchor ? `\n\nCOHERENCIA DE CARRUSEL: Mantén exactamente este estilo visual en todos los slides — ${styleAnchor}. Usa la misma paleta de colores, iluminación y composición.` : ''
  const textBlock = overlayText
    ? `\n\nTEXTO A INCORPORAR EN LA IMAGEN: "${overlayText}". Intégralo como elemento tipográfico elegante dentro de la composición. Usa tipografía limpia y profesional, asegura alta legibilidad, intégralo de forma natural con el estilo visual.`
    : ''

  const noTextInstruction = overlayText
    ? ''
    : ' Never include any text, letters, words, watermarks, or typography in the image.'

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
          content: `Eres un prompt engineer experto en Google Nano Banana Pro (Gemini 3 Pro Image).
Creas prompts descriptivos en inglés natural (no listas de keywords) para contenido médico profesional en redes sociales.
El modelo sobresale en: renderizado de texto tipográfico dentro de la imagen, consistencia de personajes, fotorrealismo 2K, y seguir instrucciones complejas en lenguaje natural.
Describe la escena como si se la explicaras a un fotógrafo: sujeto, acción, composición, iluminación, ambiente, paleta de colores, textura.${noTextInstruction}
Responde ÚNICAMENTE con el prompt mejorado en inglés, sin explicaciones ni texto adicional.`,
        },
        {
          role: 'user',
          content: `Transforma este prompt básico en un prompt profesional para generar una imagen médica para redes sociales:\n\n"${rawPrompt}"${brandBlock}${styleBlock}${anchorBlock}${textBlock}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
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
  const { prompt, aspectRatio = '1:1', socialPostId, styleKey, styleAnchor, overlayText } = await req.json()
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
    const enhanced = await enhanceImagePrompt(prompt, doctor.brandProfile ?? null, doctor.name, styleKey, styleAnchor, overlayText)
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
          description: `Imagen IA generada (Nano Banana Pro 2K)`,
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
