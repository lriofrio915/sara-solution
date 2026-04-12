import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Normalize app URL: strip trailing slash, force www on consultorio.site */
function appOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  return raw.replace(/^(https?:\/\/)(?!www\.)/, '$1www.')
}

// GET /api/auth/linkedin — inicia el flujo OAuth de LinkedIn
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const clientId = process.env.LINKEDIN_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'LINKEDIN_CLIENT_ID no configurado' }, { status: 500 })
  }

  const redirectUri = `${appOrigin()}/api/auth/linkedin/callback`
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
