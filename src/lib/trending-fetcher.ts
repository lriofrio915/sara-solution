/**
 * Trending Topics Fetcher — fuentes RSS gratuitas
 * Fuentes: Google News RSS (múltiples queries)
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

const RSS_SOURCES = [
  {
    url: 'https://news.google.com/rss/search?q=software+medico+saas+consultorio+digital&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'saas_medico',
    relevance: 0.95,
  },
  {
    url: 'https://news.google.com/rss/search?q=digitalizacion+clinicas+tecnologia+medica&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'saas_medico',
    relevance: 0.9,
  },
  {
    url: 'https://news.google.com/rss/search?q=salud+digital+telemedicina+latinoamerica&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'salud_digital',
    relevance: 0.85,
  },
  {
    url: 'https://news.google.com/rss/search?q=historia+clinica+electronica+medico&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'saas_medico',
    relevance: 0.88,
  },
  {
    url: 'https://news.google.com/rss/search?q=medicina+salud+Ecuador+tendencias&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'medicina_general',
    relevance: 0.8,
  },
  {
    url: 'https://news.google.com/rss/search?q=inteligencia+artificial+medicina+diagnostico&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'tecnologia',
    relevance: 0.92,
  },
  {
    url: 'https://news.google.com/rss/search?q=prevencion+enfermedades+salud+pacientes&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'medicina_general',
    relevance: 0.75,
  },
  {
    url: 'https://news.google.com/rss/search?q=startup+salud+healthtech+innovacion&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'tecnologia',
    relevance: 0.85,
  },
]

async function fetchRSS(url: string): Promise<{ title: string; description: string; link: string }[]> {
  try {
    // cache: 'no-store' evita que Next.js cachee las respuestas RSS entre requests
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MedSara/1.0 (+https://consultorio.site)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const items: { title: string; description: string; link: string }[] = []

    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    let match: RegExpExecArray | null
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1]
      const title = extractTag(block, 'title')
      const description = extractTag(block, 'description')
      const link = extractTag(block, 'link') || extractTag(block, 'guid')
      if (title && title.length > 10) items.push({ title, description, link })
      if (items.length >= 5) break
    }
    return items
  } catch {
    return []
  }
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/${tag}>`, 'i'))
  if (!match) return ''
  return match[1].replace(/<[^>]+>/g, '').trim().slice(0, 400)
}

function cleanTitle(title: string): string {
  return title.replace(/\s[-|–]\s[^-|–]+$/, '').trim()
}

export async function fetchAndStoreTrendingTopics(): Promise<number> {
  const allTopics: RawTopic[] = []

  await Promise.allSettled(
    RSS_SOURCES.map(async (src) => {
      const items = await fetchRSS(src.url)
      for (const item of items) {
        if (!item.title || item.title.length < 15) continue
        allTopics.push({
          title: cleanTitle(item.title),
          summary: item.description || '',
          sourceUrl: item.link,
          source: src.source,
          category: src.category,
          relevance: src.relevance,
        })
      }
    })
  )

  if (!allTopics.length) return 0

  // TTL: 12 horas
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000)

  // Dedup por título (primeros 60 chars)
  const seen = new Set<string>()
  const unique = allTopics.filter((t) => {
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
