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

  if (!res.ok) return NextResponse.json({ balance: null, error: 'Error al consultar kie.ai' })

  const data = await res.json()
  const balance = data?.data?.credit ?? data?.credit ?? 0
  return NextResponse.json({ balance })
}
