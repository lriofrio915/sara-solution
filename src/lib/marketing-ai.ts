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
  const extra = opts.extraInstructions ? `\nInstrucciones adicionales: ${opts.extraInstructions}` : ''

  // TikTok tiene su propio formato de guión de video
  if (opts.targetPlatform === 'TIKTOK') {
    return `Crea un guión de video de TikTok para un médico sobre el tema: "${opts.topic}"${extra}

El video debe durar entre 30-60 segundos. Genera el contenido REAL y completo (no uses placeholders ni ejemplos).

Devuelve SOLO este JSON con los valores reales generados:
{
  "content": "<guión completo del video con indicaciones de cada segmento>",
  "reelScript": "<guión estructurado con: GANCHO (0-3 seg), DESARROLLO (3-45 seg), CTA (últimos 5 seg)>",
  "hashtags": ["<hashtag_real_1>", "<hashtag_real_2>", "<hashtag_real_3>", "<hashtag_real_4>", "<hashtag_real_5>"],
  "imagePrompt": "<descripción en inglés del thumbnail ideal, formato vertical 9:16>",
  "suggestedTime": "<día y hora recomendada, ej: Martes 7pm>"
}`
  }

  const platformNote = opts.targetPlatform === 'BOTH'
    ? 'para Instagram y Facebook'
    : `para ${opts.targetPlatform}`

  if (opts.contentType === 'POST') {
    return `Crea un post ${platformNote} sobre el tema: "${opts.topic}"${extra}

Genera el contenido REAL y completo (no uses placeholders ni ejemplos genéricos). El texto debe estar listo para publicar.

Devuelve SOLO este JSON con los valores reales generados:
{
  "content": "<texto real del post, máximo 2200 caracteres, con emojis apropiados>",
  "hashtags": ["<hashtag_real_1>", "<hashtag_real_2>", "<hashtag_real_3>", "<hashtag_real_4>", "<hashtag_real_5>"],
  "imagePrompt": "<descripción en inglés de la imagen ideal para ilustrar este post>",
  "suggestedTime": "<mejor día y hora para publicar, ej: Martes 9am>"
}`
  }

  if (opts.contentType === 'CAROUSEL') {
    return `Crea un carrusel ${platformNote} sobre el tema: "${opts.topic}" (5-7 diapositivas)${extra}

Genera el contenido REAL y completo para cada diapositiva (no uses placeholders).

Devuelve SOLO este JSON con los valores reales generados:
{
  "content": "<caption principal real del carrusel>",
  "hashtags": ["<hashtag_real_1>", "<hashtag_real_2>", "<hashtag_real_3>"],
  "imagePrompt": "<descripción en inglés del estilo visual del carrusel>",
  "suggestedTime": "<mejor día y hora, ej: Miércoles 7pm>",
  "carouselSlides": [
    { "title": "<título real de la diapositiva>", "body": "<texto breve real de la diapositiva>" }
  ]
}`
  }

  if (opts.contentType === 'REEL') {
    return `Crea el guión de un Reel ${platformNote} sobre el tema: "${opts.topic}" (duración ~30-60 segundos)${extra}

Genera el contenido REAL y completo (no uses placeholders).

Devuelve SOLO este JSON con los valores reales generados:
{
  "content": "<caption real del reel>",
  "hashtags": ["<hashtag_real_1>", "<hashtag_real_2>", "<hashtag_real_3>"],
  "imagePrompt": "<descripción en inglés de la escena o thumbnail ideal>",
  "suggestedTime": "<mejor día y hora, ej: Viernes 6pm>",
  "reelScript": "<guión completo real del reel con indicaciones de escena>"
}`
  }

  // STORY
  return `Crea una historia (Story) ${platformNote} sobre el tema: "${opts.topic}"${extra}

Genera el contenido REAL (no uses placeholders).

Devuelve SOLO este JSON con los valores reales generados:
{
  "content": "<texto real de la story, máximo 150 caracteres>",
  "hashtags": ["<hashtag_real_1>", "<hashtag_real_2>"],
  "imagePrompt": "<descripción en inglés de la imagen o video de fondo ideal>",
  "suggestedTime": "<mejor día y hora, ej: Lunes 8am>"
}`
}

function isTemplatePlaceholder(value: string): boolean {
  // Detect if the model returned the schema template instead of real content
  const templateMarkers = [
    '<hashtag_real', '<texto real', '<caption real', '<guión', '<descripción',
    '<mejor día', '<título real', '<texto breve real', '<mejor', '<escena',
    'hashtag1', 'hashtag2', 'hashtag_real_1',
    'texto del post (máximo', 'caption principal del carrusel',
    'guión completo del video', 'caption del reel',
  ]
  const lower = value.toLowerCase()
  return templateMarkers.some(m => lower.includes(m.toLowerCase()))
}

async function callModel(client: OpenAI, systemPrompt: string, userPrompt: string): Promise<GeneratedContent> {
  const completion = await client.chat.completions.create({
    model: 'deepseek/deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  const clean = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  let parsed: GeneratedContent
  try {
    parsed = JSON.parse(clean) as GeneratedContent
  } catch {
    throw new Error('JSON inválido en respuesta del modelo')
  }

  // Validate that the model returned real content, not the template
  if (!parsed.content || isTemplatePlaceholder(parsed.content)) {
    throw new Error('El modelo devolvió el template sin generar contenido real')
  }

  // Clean placeholder hashtags
  if (parsed.hashtags) {
    parsed.hashtags = parsed.hashtags.filter(h => !isTemplatePlaceholder(h))
  }

  return parsed
}

export async function generateMarketingContent(opts: GeneratePostOptions): Promise<GeneratedContent> {
  const client = getClient()
  const systemPrompt = buildSystemPrompt(opts.brand)
  const userPrompt = buildUserPrompt(opts)

  // Try up to 2 times in case the model returns template text
  try {
    return await callModel(client, systemPrompt, userPrompt)
  } catch (firstErr) {
    console.warn('Marketing AI first attempt failed, retrying:', firstErr)
    try {
      return await callModel(client, systemPrompt, userPrompt)
    } catch (secondErr) {
      console.error('Marketing AI both attempts failed:', secondErr)
      throw secondErr
    }
  }
}

export interface AutopilotOptions {
  brand: BrandContext
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  scheduledDates: string[] // pre-computed list of YYYY-MM-DD, one per post
  platforms?: string[]
}

export interface AutopilotPost {
  topic: string
  contentType: 'POST' | 'CAROUSEL' | 'REEL' | 'STORY'
  scheduledDate: string // YYYY-MM-DD (AI hint; route overrides with scheduledDates[i])
  suggestedTime: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  carouselSlides?: { title: string; body: string }[]
  reelScript?: string
  platform?: string
}

export async function generateAutopilotCalendar(opts: AutopilotOptions): Promise<AutopilotPost[]> {
  const client = getClient()

  const name = opts.brand.clinicName ?? opts.brand.doctorName
  const specs = opts.brand.specialties.join(', ') || 'medicina general'

  const platforms = opts.platforms?.length ? opts.platforms : ['INSTAGRAM']
  const platformsStr = platforms.join(', ')
  const total = opts.scheduledDates.length
  const datesStr = opts.scheduledDates.join(', ')

  const planPrompt = `Eres un experto en marketing médico. Crea un plan de contenido para redes sociales para: ${name} (${specs}).

Genera EXACTAMENTE ${total} publicaciones. Usa estas fechas en orden exacto (una fecha por post): ${datesStr}

Plataformas a usar: ${platformsStr}. Distribuye los posts equilibradamente entre ellas. Asigna a cada post el campo "platform" con uno de: ${platformsStr}.

Para cada post incluye: topic, contentType (POST/CAROUSEL/REEL/STORY), scheduledDate (usa la fecha que corresponde según el orden), suggestedTime (hora recomendada), content (texto completo del post), hashtags (array), imagePrompt (descripción en inglés de la imagen ideal), platform.

Reglas:
- Variedad de tipos (mix de POST, CAROUSEL, REEL, STORY)
- Si hay varios posts el mismo día, que sean de temas y tipos diferentes
- Temas relevantes para ${specs}, educativos y atractivos
- Todo en español de Ecuador

Responde SOLO con un array JSON de exactamente ${total} elementos:
[
  {
    "topic": "...",
    "contentType": "POST",
    "scheduledDate": "YYYY-MM-DD",
    "suggestedTime": "9:00 AM",
    "content": "...",
    "hashtags": [],
    "imagePrompt": "...",
    "platform": "${platforms[0]}"
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
