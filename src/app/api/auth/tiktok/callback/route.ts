import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/auth/tiktok/callback — callback OAuth de TikTok
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?error=no_auth`)
  }

  const url = new URL(req.url)
  const code  = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/integraciones?error=tiktok_denied`)
  }

  const clientKey    = process.env.TIKTOK_CLIENT_KEY!.trim()
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!.trim()
  const redirectUri  = `${appUrl}/api/auth/tiktok/callback`

  // Retrieve PKCE code verifier from cookie
  const codeVerifier = req.headers.get('cookie')
    ?.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('tiktok_cv='))
    ?.split('=')[1] ?? ''

  try {
    // 1. Exchange code for access_token
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('No access_token en respuesta de TikTok')

    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 86400) * 1000).toISOString()

    // 2. Get user info
    const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = await userRes.json()
    const ttUserId = userData?.data?.user?.open_id ?? null

    // 3. Save token in Doctor
    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true, socialTokens: true },
    })
    if (!doctor) throw new Error('Doctor no encontrado')

    let tokens: Record<string, unknown> = {}
    if (doctor.socialTokens) {
      try { tokens = JSON.parse(doctor.socialTokens) } catch { /* ignore */ }
    }

    tokens.tiktok = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      userId: ttUserId,
      expiresAt,
    }

    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { socialTokens: JSON.stringify(tokens) },
    })

    const res = NextResponse.redirect(`${appUrl}/integraciones?success=tiktok`)
    res.cookies.delete('tiktok_cv')
    return res
  } catch (err) {
    console.error('[TIKTOK OAUTH]', err)
    return NextResponse.redirect(`${appUrl}/integraciones?error=tiktok_failed`)
  }
}
