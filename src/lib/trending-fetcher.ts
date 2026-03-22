/**
 * Trending Topics Fetcher — Brave Search News API
 * Categorías: saas_medico | salud_digital | medicina_general | tecnologia
 */

import { prisma } from './prisma'

interface RawTopic {
  title: string
  summary: string
  sourceUrl: string
  source: string
  category: string
  relevance: number
}

const BRAVE_QUERIES = [
  { q: 'software médico consultorio digital SaaS',          category: 'saas_medico',      relevance: 0.95 },
  { q: 'historia clínica electrónica gestión médica',       category: 'saas_medico',      relevance: 0.90 },
  { q: 'telemedicina salud digital latinoamerica 2026',     category: 'salud_digital',    relevance: 0.88 },
  { q: 'salud digital pacientes aplicaciones móviles',      category: 'salud_digital',    relevance: 0.85 },
  { q: 'inteligencia artificial medicina diagnóstico',      category: 'tecnologia',       relevance: 0.92 },
  { q: 'healthtech innovación tecnología médica 2026',      category: 'tecnologia',       relevance: 0.87 },
  { q: 'prevención enfermedades salud pacientes Ecuador',   category: 'medicina_general', relevance: 0.80 },
  { q: 'medicina general bienestar salud tendencias',       category: 'medicina_general', relevance: 0.75 },
]

// Temas curados de respaldo cuando la API falla
const FALLBACK_TOPICS: RawTopic[] = [
  {
    title: 'La inteligencia artificial está transformando el diagnóstico médico en Latinoamérica',
    summary: 'Nuevas herramientas de IA permiten detectar enfermedades con mayor precisión y rapidez, cambiando la práctica médica.',
    sourceUrl: '', source: 'curado', category: 'tecnologia', relevance: 0.92,
  },
  {
    title: 'Telemedicina: cómo los médicos están llegando a más pacientes desde sus consultorios',
    summary: 'La adopción de consultas virtuales sigue creciendo en Ecuador y Latinoamérica, mejorando el acceso a salud.',
    sourceUrl: '', source: 'curado', category: 'salud_digital', relevance: 0.88,
  },
  {
    title: 'Historia clínica electrónica: el paso que todo médico moderno debe dar',
    summary: 'Los sistemas digitales de gestión médica reducen errores, ahorran tiempo y mejoran la experiencia del paciente.',
    sourceUrl: '', source: 'curado', category: 'saas_medico', relevance: 0.90,
  },
  {
    title: 'Prevención del síndrome metabólico: consejos clave para tus pacientes',
    summary: 'El síndrome metabólico afecta a 1 de cada 4 adultos. La detección temprana y el estilo de vida son clave.',
    sourceUrl: '', source: 'curado', category: 'medicina_general', relevance: 0.82,
  },
  {
    title: 'Software médico en la nube: por qué los consultorios pequeños están migrando',
    summary: 'Las soluciones SaaS para médicos ofrecen citas online, expedientes digitales y recordatorios sin inversión en infraestructura.',
    sourceUrl: '', source: 'curado', category: 'saas_medico', relevance: 0.93,
  },
  {
    title: 'Salud mental: el tema más buscado por pacientes en internet en 2026',
    summary: 'La ansiedad y el estrés encabezan las consultas de salud mental en Ecuador y la región.',
    sourceUrl: '', source: 'curado', category: 'medicina_general', relevance: 0.87,
  },
  {
    title: 'HealthTech 2026: las 5 innovaciones que están cambiando la medicina preventiva',
    summary: 'Desde wearables hasta apps de seguimiento, la tecnología está empoderando a pacientes y médicos.',
    sourceUrl: '', source: 'curado', category: 'tecnologia', relevance: 0.89,
  },
  {
    title: 'Cómo los médicos usan redes sociales para construir su reputación profesional',
    summary: 'Cada vez más especialistas comparten contenido educativo en LinkedIn e Instagram para atraer pacientes y generar confianza.',
    sourceUrl: '', source: 'curado', category: 'saas_medico', relevance: 0.85,
  },
]

async function fetchBraveNews(query: string): Promise<{ title: string; description: string; url: string }[]> {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) return []

  try {
    const params = new URLSearchParams({
      q: query,
      count: '5',
      country: 'ALL',
      search_lang: 'es',
      freshness: 'pm', // último mes
    })
    const res = await fetch(`https://api.search.brave.com/res/v1/news/search?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json() as { results?: { title?: string; description?: string; url?: string }[] }
    return (data.results ?? [])
      .filter(r => r.title && r.title.length > 10)
      .map(r => ({
        title: r.title ?? '',
        description: r.description ?? '',
        url: r.url ?? '',
      }))
  } catch {
    return []
  }
}

export async function fetchAndStoreTrendingTopics(): Promise<number> {
  const allTopics: RawTopic[] = []

  await Promise.allSettled(
    BRAVE_QUERIES.map(async (src) => {
      const items = await fetchBraveNews(src.q)
      for (const item of items) {
        allTopics.push({
          title: item.title.replace(/\s[-|–]\s[^-|–]+$/, '').trim(),
          summary: item.description.slice(0, 400),
          sourceUrl: item.url,
          source: 'brave_news',
          category: src.category,
          relevance: src.relevance,
        })
      }
    })
  )

  // Si la API no devolvió nada, usar temas curados de respaldo
  const topicsToSave = allTopics.length > 0 ? allTopics : FALLBACK_TOPICS
  const isFallback = allTopics.length === 0

  const expiresAt = new Date(Date.now() + (isFallback ? 24 : 12) * 60 * 60 * 1000)

  // Dedup por título (primeros 60 chars)
  const seen = new Set<string>()
  const unique = topicsToSave.filter((t) => {
    const key = t.title.slice(0, 60).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  await prisma.trendingTopic.createMany({
    data: unique.map((t) => ({
      title: t.title,
      summary: t.summary || null,
      source: t.source,
      sourceUrl: t.sourceUrl || null,
      category: t.category,
      relevance: t.relevance,
      expiresAt,
    })),
    skipDuplicates: false,
  })

  return unique.length
}

export async function deleteExpiredTrendingTopics() {
  return prisma.trendingTopic.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
}
