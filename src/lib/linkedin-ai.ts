/**
 * LinkedIn AI — Generación de contenido especializado para LinkedIn
 * Dos estrategias:
 *   B2B — Admin Sara Medical buscando médicos para el SaaS
 *   B2C — Médico buscando pacientes
 */

import OpenAI from 'openai'
import type { BrandContext } from './marketing-ai'

export type LinkedInStrategy = 'B2B' | 'B2C'

export interface GenerateLinkedInOptions {
  topic: string
  strategy: LinkedInStrategy
  brand: BrandContext
  trendContext?: string   // resumen del tema trending para enriquecer el post
  extraInstructions?: string
}

export interface GeneratedLinkedInPost {
  content: string           // cuerpo del post (hook + desarrollo + CTA)
  hashtags: string[]        // 3-5 hashtags
  imagePrompt: string       // prompt para generar imagen 1200x627 (landscape)
  suggestedTime: string     // mejor horario para publicar
  hook: string              // primera línea (para preview)
  cta: string               // llamada a la acción
}

function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada')
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://consultorio.site',
      'X-Title': 'MedSara LinkedIn',
    },
  })
}

function buildSystemPromptB2B(brand: BrandContext): string {
  return `Eres un experto en marketing B2B y SaaS médico. Tu trabajo es crear posts de LinkedIn de alto impacto para Sara Medical, un software de gestión médica (SaaS) para doctores en Ecuador y Latinoamérica.

OBJETIVO: Atraer médicos y clínicas interesados en digitalizar su consultorio usando Sara Medical.

IDENTIDAD DE SARA MEDICAL:
- Producto: Software médico SaaS (historias clínicas, citas, recetas, telemedicina, IA médica)
- Mercado: Médicos independientes y clínicas en Ecuador / LATAM
- Propuesta de valor: Consultorio digital completo, fácil de usar, con IA integrada (Sara IA)
- Beneficios clave: Ahorro de tiempo, más pacientes, menor papeleo, cumplimiento LOPDP

VOZ DE MARCA:
- Tono: Profesional, innovador, confiable, orientado a resultados
- Sin jerga técnica excesiva
- Habla el idioma del médico, no del programador

FORMATO LINKEDIN B2B:
1. Primera línea = HOOK irresistible (genera curiosidad, dolor o estadística)
2. Desarrollo en párrafos cortos (máximo 3 líneas por párrafo)
3. Usar saltos de línea generosamente
4. CTA claro al final (agendar demo, solicitar prueba gratis)
5. Longitud ideal: 800-1300 caracteres
6. Hashtags: 3-5, mezcla español/inglés
7. Nada de asteriscos (*texto*) para negritas — LinkedIn no los renderiza bien
8. Responde ÚNICAMENTE con JSON válido, sin texto adicional.`
}

function buildSystemPromptB2C(brand: BrandContext): string {
  const name = brand.clinicName ?? brand.doctorName
  const specs = brand.specialties.join(', ') || 'medicina general'
  const tones = brand.tones.length ? brand.tones.join(', ') : 'profesional, cercano, empático'
  const audience = brand.targetAudience ?? 'pacientes y profesionales de la salud'
  const excluded = brand.excludedTopics ? `\nTemas a EVITAR: ${brand.excludedTopics}` : ''

  return `Eres un experto en personal branding médico en LinkedIn. Creas contenido para que médicos y especialistas atraigan pacientes, construyan autoridad y generen confianza en la red profesional.

IDENTIDAD DEL MÉDICO:
- Nombre/Clínica: ${name}
- Especialidad: ${specs}
- Tono: ${tones}
- Audiencia: ${audience}${excluded}

OBJETIVO: Posicionar al médico como experto de confianza en LinkedIn para atraer pacientes y referidos.

FORMATO LINKEDIN B2C MÉDICO:
1. Primera línea = HOOK emocional o educativo que para el scroll
2. Contenido educativo, preventivo o de casos (sin revelar datos de pacientes)
3. Párrafos cortos separados por saltos de línea
4. CTA hacia consulta: "Agenda tu cita", "Escríbeme", "Consulta sin compromiso"
5. Longitud: 800-1200 caracteres
6. Hashtags: 3-5, relevantes a la especialidad
7. Sin asteriscos (*texto*) para negritas
8. Nunca hacer promesas de cura o garantías médicas
9. Responde ÚNICAMENTE con JSON válido, sin texto adicional.`
}

function buildUserPrompt(opts: GenerateLinkedInOptions): string {
  const trendNote = opts.trendContext
    ? `\n\nCONTEXTO DE TENDENCIA ACTUAL:\n${opts.trendContext}\n\nUsa este contexto para hacer el post más relevante y de actualidad.`
    : ''

  const extra = opts.extraInstructions
    ? `\n\nInstrucciones adicionales: ${opts.extraInstructions}`
    : ''

  return `Crea un post de LinkedIn sobre: "${opts.topic}"${trendNote}${extra}

Responde con este JSON exacto:
{
  "hook": "primera línea del post (máximo 120 caracteres, sin punto final para generar suspenso)",
  "content": "post completo de LinkedIn (hook incluido, con saltos de línea \\n entre párrafos, sin markdown)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "imagePrompt": "descripción en inglés de la imagen ideal en formato landscape 1200x627px, sin texto en la imagen, estilo fotográfico o ilustración profesional",
  "suggestedTime": "día y hora óptimos para publicar en LinkedIn (ej: Martes 8am o Miércoles 12pm)",
  "cta": "la llamada a la acción del post (1 frase)"
}`
}

export async function generateLinkedInPost(opts: GenerateLinkedInOptions): Promise<GeneratedLinkedInPost> {
  const client = getClient()

  const systemPrompt = opts.strategy === 'B2B'
    ? buildSystemPromptB2B(opts.brand)
    : buildSystemPromptB2C(opts.brand)

  const completion = await client.chat.completions.create({
    model: 'deepseek/deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildUserPrompt(opts) },
    ],
    temperature: 0.75,
    max_tokens: 1500,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  const clean = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  try {
    return JSON.parse(clean) as GeneratedLinkedInPost
  } catch {
    return {
      content: raw,
      hashtags: [],
      imagePrompt: 'professional medical technology landscape',
      suggestedTime: 'Martes 8am',
      hook: raw.split('\n')[0] ?? raw.slice(0, 120),
      cta: 'Contáctanos para más información',
    }
  }
}
