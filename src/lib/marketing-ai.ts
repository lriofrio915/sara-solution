/**
 * Marketing AI — Content generation via OpenRouter (DeepSeek)
 * Same client pattern as Sara IA.
 */

import OpenAI from 'openai'

export interface BrandContext {
  clinicName?: string | null
  doctorName: string
  specialties: string[]
  slogan?: string | null
  tones: string[]
  targetAudience?: string | null
  excludedTopics?: string | null
  primaryColor?: string
}

export interface GeneratePostOptions {
  topic: string
  contentType: 'POST' | 'CAROUSEL' | 'REEL' | 'STORY'
  targetPlatform: 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'BOTH'
  brand: BrandContext
  extraInstructions?: string
}

export interface GeneratedContent {
  content: string
  hashtags: string[]
  imagePrompt?: string
  suggestedTime?: string
  carouselSlides?: { title: string; body: string }[]
  reelScript?: string
}

function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada')
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site',
      'X-Title': 'MedSara Marketing',
    },
  })
}

function buildSystemPrompt(brand: BrandContext): string {
  const name = brand.clinicName ?? brand.doctorName
  const specs = brand.specialties.join(', ') || 'medicina general'
  const tones = brand.tones.length ? brand.tones.join(', ') : 'profesional, cercano'
  const audience = brand.targetAudience ?? 'pacientes en general'
  const excluded = brand.excludedTopics ? `\nTemas a EVITAR: ${brand.excludedTopics}` : ''

  return `Eres un experto en marketing médico para redes sociales. Creas contenido de alta calidad para médicos y clínicas en Ecuador.

IDENTIDAD DE MARCA:
- Nombre: ${name}
- Especialidad: ${specs}
- Slogan: ${brand.slogan ?? '(ninguno)'}
- Tono de comunicación: ${tones}
- Audiencia objetivo: ${audience}${excluded}

REGLAS:
1. Todo el contenido en español (Ecuador).
2. Nunca hacer promesas de cura o garantías médicas.
3. Incluir llamadas a la acción claras (agendar cita, consultar, etc.).
4. Los hashtags deben ser relevantes, en español e inglés mezclados, máximo 15.
5. El contenido debe ser educativo, confiable y empático.
6. Responde ÚNICAMENTE con JSON válido, sin texto adicional.`
}

function buildUserPrompt(opts: GeneratePostOptions): string {
  // TikTok tiene su propio formato de guión de video
  if (opts.targetPlatform === 'TIKTOK') {
    return `Crea un guión de video de TikTok para un médico sobre: "${opts.topic}"
${opts.extraInstructions ? `\nInstrucciones adicionales: ${opts.extraInstructions}` : ''}

El video debe durar entre 30-60 segundos. Responde con este JSON:
{
  "content": "guión completo del video con indicaciones de cada segmento (separa secciones con saltos de línea)",
  "reelScript": "🎬 GANCHO (0-3 seg): [texto en pantalla]\n\n📱 DESARROLLO (3-45 seg): [contenido principal paso a paso]\n\n✅ CTA (últimos 5 seg): [llamada a la acción]",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "imagePrompt": "descripción del thumbnail ideal para el video de TikTok, formato vertical 9:16, llamativo",
  "suggestedTime": "Ej: Martes 7pm o Viernes 9pm"
}`
  }

  const platformNote = opts.targetPlatform === 'BOTH'
    ? 'para Instagram y Facebook'
    : `para ${opts.targetPlatform}`

  if (opts.contentType === 'POST') {
    return `Crea un post ${platformNote} sobre: "${opts.topic}"
${opts.extraInstructions ? `\nInstrucciones adicionales: ${opts.extraInstructions}` : ''}

Responde con este JSON:
{
  "content": "texto del post (máximo 2200 caracteres, con emojis si aplica)",
  "hashtags": ["hashtag1", "hashtag2"],
  "imagePrompt": "descripción en inglés de la imagen ideal para este post",
  "suggestedTime": "Ej: Martes 9am"
}`
  }

  if (opts.contentType === 'CAROUSEL') {
    return `Crea un carrusel ${platformNote} sobre: "${opts.topic}" (5-7 diapositivas)
${opts.extraInstructions ? `\nInstrucciones adicionales: ${opts.extraInstructions}` : ''}

Responde con este JSON:
{
  "content": "caption principal del carrusel",
  "hashtags": ["hashtag1", "hashtag2"],
  "imagePrompt": "estilo visual general del carrusel",
  "suggestedTime": "Ej: Miércoles 7pm",
  "carouselSlides": [
    { "title": "Título slide 1", "body": "Texto breve slide 1" }
  ]
}`
  }

  if (opts.contentType === 'REEL') {
    return `Crea el guión de un Reel ${platformNote} sobre: "${opts.topic}" (duración ~30-60 segundos)
${opts.extraInstructions ? `\nInstrucciones adicionales: ${opts.extraInstructions}` : ''}

Responde con este JSON:
{
  "content": "caption del reel",
  "hashtags": ["hashtag1", "hashtag2"],
  "imagePrompt": "escena o thumbnail ideal para el reel",
  "suggestedTime": "Ej: Viernes 6pm",
  "reelScript": "guión completo del reel con indicaciones de escena"
}`
  }

  // STORY
  return `Crea una historia (Story) ${platformNote} sobre: "${opts.topic}"
${opts.extraInstructions ? `\nInstrucciones adicionales: ${opts.extraInstructions}` : ''}

Responde con este JSON:
{
  "content": "texto de la story (muy breve, máximo 150 caracteres)",
  "hashtags": ["hashtag1"],
  "imagePrompt": "descripción de la imagen o video de fondo",
  "suggestedTime": "Ej: Lunes 8am"
}`
}

export async function generateMarketingContent(opts: GeneratePostOptions): Promise<GeneratedContent> {
  const client = getClient()

  const completion = await client.chat.completions.create({
    model: 'deepseek/deepseek-chat',
    messages: [
      { role: 'system', content: buildSystemPrompt(opts.brand) },
      { role: 'user', content: buildUserPrompt(opts) },
    ],
    temperature: 0.8,
    max_tokens: 2000,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  // Strip markdown code fences if present
  const clean = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  try {
    return JSON.parse(clean) as GeneratedContent
  } catch {
    // Return raw content as text if JSON parsing fails
    return { content: raw, hashtags: [] }
  }
}

export interface AutopilotOptions {
  brand: BrandContext
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  postsCount: number
  startDate: string // YYYY-MM-DD
}

export interface AutopilotPost {
  topic: string
  contentType: 'POST' | 'CAROUSEL' | 'REEL' | 'STORY'
  scheduledDate: string // YYYY-MM-DD
  suggestedTime: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  carouselSlides?: { title: string; body: string }[]
  reelScript?: string
}

export async function generateAutopilotCalendar(opts: AutopilotOptions): Promise<AutopilotPost[]> {
  const client = getClient()

  const name = opts.brand.clinicName ?? opts.brand.doctorName
  const specs = opts.brand.specialties.join(', ') || 'medicina general'

  const planPrompt = `Eres un experto en marketing médico. Crea un plan de contenido para redes sociales para: ${name} (${specs}).

Genera exactamente ${opts.postsCount} publicaciones con fechas a partir de ${opts.startDate} con frecuencia ${opts.frequency}.

Para cada post incluye: topic (tema), contentType (POST/CAROUSEL/REEL/STORY), scheduledDate (YYYY-MM-DD), suggestedTime, content (texto completo del post), hashtags (array), imagePrompt.

Reglas:
- Variedad de tipos (mix de POST, CAROUSEL, REEL, STORY)
- Temas relevantes para ${specs}
- Contenido educativo y atractivo
- Todo en español de Ecuador

Responde SOLO con un array JSON:
[
  {
    "topic": "...",
    "contentType": "POST",
    "scheduledDate": "YYYY-MM-DD",
    "suggestedTime": "...",
    "content": "...",
    "hashtags": [],
    "imagePrompt": "..."
  }
]`

  const completion = await client.chat.completions.create({
    model: 'deepseek/deepseek-chat',
    messages: [{ role: 'user', content: planPrompt }],
    temperature: 0.7,
    max_tokens: 4000,
  })

  const raw = completion.choices[0]?.message?.content ?? '[]'
  const clean = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  try {
    return JSON.parse(clean) as AutopilotPost[]
  } catch {
    return []
  }
}
