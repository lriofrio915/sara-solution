/**
 * Trending Topics Fetcher — fuentes RSS gratuitas
 * Fuentes: Google News RSS, PubMed RSS, WHO RSS
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
  // Google News — Tecnología médica / SaaS salud
  {
    url: 'https://news.google.com/rss/search?q=software+medico+salud+digital+saas&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'saas_medico',
    relevance: 0.9,
  },
  // Google News — Salud digital LATAM
  {
    url: 'https://news.google.com/rss/search?q=salud+digital+telemedicina+latinoamerica&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'salud_digital',
    relevance: 0.85,
  },
  // Google News — Medicina general Ecuador
  {
    url: 'https://news.google.com/rss/search?q=medicina+salud+pacientes+Ecuador&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'medicina_general',
    relevance: 0.75,
  },
  // Google News — IA en medicina
  {
    url: 'https://news.google.com/rss/search?q=inteligencia+artificial+medicina+diagnostico&hl=es-419&gl=EC&ceid=EC:es-419',
    source: 'google_news',
    category: 'tecnologia',
    relevance: 0.9,
  },
  // PubMed — Últimas publicaciones médicas relevantes
  {
    url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/0VBXGCGKHjKIbJkVCIa5RqpQpTwnwSTkXpnzY1BJXT8Hgf8TRJ/?limit=10&format=abstract',
    source: 'pubmed',
    category: 'medicina_general',
    relevance: 0.8,
  },
  // WHO — Noticias OMS
  {
    url: 'https://www.who.int/feeds/entity/mediacentre/news/en/rss.xml',
    source: 'who',
    category: 'salud_digital',
    relevance: 0.7,
  },
]

async function fetchRSS(url: string): Promise<{ title: string; description: string; link: string }[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MedSara/1.0 (+https://consultorio.site)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const items: { title: string; description: string; link: string }[] = []

    // Parse <item> blocks from RSS XML
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    let match: RegExpExecArray | null
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1]
      const title = extractTag(block, 'title')
      const description = extractTag(block, 'description')
      const link = extractTag(block, 'link') || extractTag(block, 'guid')
      if (title) items.push({ title, description, link })
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
  // Remove source suffix like " - El Comercio" or " | Reuters"
  return title.replace(/\s[-|]\s[^-|]+$/, '').trim()
}

export async function fetchAndStoreTrendingTopics(): Promise<number> {
  const allTopics: RawTopic[] = []

  await Promise.allSettled(
    RSS_SOURCES.map(async (src) => {
      const items = await fetchRSS(src.url)
      for (const item of items) {
        if (!item.title || item.title.length < 10) continue
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

export async function getActiveTrendingTopics(limit = 20) {
  return prisma.trendingTopic.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: [{ relevance: 'desc' }, { fetchedAt: 'desc' }],
    take: limit,
  })
}

export async function deleteExpiredTrendingTopics() {
  return prisma.trendingTopic.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
}
