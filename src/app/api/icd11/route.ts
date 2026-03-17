import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchIcd11, type Icd11Result } from '@/lib/icd'

export const dynamic = 'force-dynamic'

// GET /api/icd11?q=query
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (!q) {
    return NextResponse.json({ results: [] satisfies Icd11Result[] })
  }

  const results = await searchIcd11(q)
  return NextResponse.json({ results })
}
