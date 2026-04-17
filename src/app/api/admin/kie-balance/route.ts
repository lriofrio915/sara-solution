import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email !== 'lriofrio915@gmail.com')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const apiKey = process.env.KIE_AI_API_KEY
  if (!apiKey) return NextResponse.json({ balance: null, error: 'KIE_AI_API_KEY no configurada' })

  const res = await fetch('https://api.kie.ai/api/v1/chat/credit', {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })

  const data = await res.json()

  // kie.ai returns HTTP 200 even for auth/config errors — check the code field
  if (data?.code !== undefined && data.code !== 200) {
    return NextResponse.json({ balance: null, error: data.msg ?? `kie.ai error ${data.code}` })
  }

  if (!res.ok) {
    return NextResponse.json({ balance: null, error: `HTTP ${res.status}` })
  }

  // Success: { code: 200, data: <number> }
  const balance = typeof data?.data === 'number' ? data.data : 0
  return NextResponse.json({ balance })
}
