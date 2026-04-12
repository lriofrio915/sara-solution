import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Derive origin from incoming request headers — works on Vercel without env var issues */
function originFromRequest(req: Request): string {
  // x-forwarded-host is set by Vercel's edge and reflects the real public hostname
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  return `${proto}://${host}`
}

// GET /api/auth/linkedin — inicia el flujo OAuth de LinkedIn
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const clientId = process.env.LINKEDIN_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'LINKEDIN_CLIENT_ID no configurado' }, { status: 500 })
  }

  const redirectUri = `${originFromRequest(req)}/api/auth/linkedin/callback`
  console.log('[LINKEDIN] redirect_uri enviado a LinkedIn:', redirectUri)

  // Scopes para LinkedIn API v2
  const scope = ['openid', 'profile', 'w_member_social'].join(' ')

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', 'linkedin_connect')

  return NextResponse.redirect(authUrl.toString())
}
