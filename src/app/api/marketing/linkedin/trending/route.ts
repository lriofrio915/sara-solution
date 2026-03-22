import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchAndStoreTrendingTopics, getActiveTrendingTopics, deleteExpiredTrendingTopics } from '@/lib/trending-fetcher'

async function isAuthenticated() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}

// GET /api/marketing/linkedin/trending — devuelve topics activos
// Si no hay topics, los fetcha automáticamente
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? undefined
  const refresh = searchParams.get('refresh') === '1'

  if (refresh) {
    await deleteExpiredTrendingTopics()
    await fetchAndStoreTrendingTopics()
  }

  const { prisma } = await import('@/lib/prisma')
  const where = {
    expiresAt: { gt: new Date() },
    ...(category ? { category } : {}),
  }

  const topics = await prisma.trendingTopic.findMany({
    where,
    orderBy: [{ relevance: 'desc' }, { fetchedAt: 'desc' }],
    take: 20,
  })

  // Si no hay topics vigentes, fetch automático
  if (topics.length === 0 && !refresh) {
    await fetchAndStoreTrendingTopics()
    const fresh = await prisma.trendingTopic.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: [{ relevance: 'desc' }, { fetchedAt: 'desc' }],
      take: 20,
    })
    return NextResponse.json({ topics: fresh, refreshed: true })
  }

  return NextResponse.json({ topics, refreshed: false })
}

// POST /api/marketing/linkedin/trending — agregar topic manual
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { title, summary, category = 'medicina_general' } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

  const { prisma } = await import('@/lib/prisma')
  const topic = await prisma.trendingTopic.create({
    data: {
      title: title.trim(),
      summary: summary?.trim() ?? null,
      source: 'manual',
      category,
      relevance: 1.0,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    },
  })

  return NextResponse.json({ topic })
}
