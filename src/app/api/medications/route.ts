import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/medications?q=query
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''

    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const results = await prisma.catalogoMedicamento.findMany({
      where: {
        activo: true,
        OR: [
          { dci: { contains: q, mode: 'insensitive' } },
          { codigoAtc: { contains: q, mode: 'insensitive' } },
          { formaFarmaceutica: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { dci: 'asc' },
      take: 20,
    })

    return NextResponse.json({ results })
  } catch (err) {
    console.error('GET /api/medications:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
