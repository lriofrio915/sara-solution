import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchCie10 } from '@/lib/cie10-data'

export const dynamic = 'force-dynamic'

// GET /api/cie10?q=query
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (!q) return NextResponse.json({ results: [] })

  const results = searchCie10(q, 20).map(e => ({ code: e.code, title: e.desc }))
  return NextResponse.json({ results })
}
