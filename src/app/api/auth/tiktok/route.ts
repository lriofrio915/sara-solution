import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

// GET /api/auth/tiktok — inicia el flujo OAuth de TikTok
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const clientKey = process.env.TIKTOK_CLIENT_KEY
  if (!clientKey) {
    return NextResponse.json({ error: 'TIKTOK_CLIENT_KEY no configurado' }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`
  // PKCE code verifier
  const codeVerifier = randomBytes(32).toString('base64url')
  // Store verifier in cookie for callback
  const response = NextResponse.redirect(buildAuthUrl(clientKey, redirectUri, codeVerifier))
  response.cookies.set('tiktok_cv', codeVerifier, { httpOnly: true, sameSite: 'lax', maxAge: 600, path: '/' })
  return response
}

function buildAuthUrl(clientKey: string, redirectUri: string, codeVerifier: string): string {
  // TikTok requires code_challenge = BASE64URL(SHA256(code_verifier))
  const { createHash } = require('crypto')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')

  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/')
  authUrl.searchParams.set('client_key', clientKey)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'user.info.basic')
  authUrl.searchParams.set('state', 'tiktok_connect')
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  return authUrl.toString()
}
