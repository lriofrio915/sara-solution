import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/auth/linkedin/callback — callback OAuth de LinkedIn
export async function GET(req: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL!
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_auth`)
  }

  const url = new URL(req.url)
  const code  = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/integraciones?error=linkedin_denied`)
  }

  const clientId     = process.env.LINKEDIN_CLIENT_ID!
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`
  console.log('[LINKEDIN CB] origin:', origin, '| redirect_uri:', redirectUri)

  try {
    // 1. Intercambiar code por access_token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('No access_token en respuesta de LinkedIn')

    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 5184000) * 1000).toISOString()

    // 2. Obtener perfil del usuario
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profileData = await profileRes.json()
    const liUserId = profileData.sub ?? null

    // 3. Guardar token en Doctor
    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true, socialTokens: true },
    })
    if (!doctor) throw new Error('Doctor no encontrado')

    let tokens: Record<string, unknown> = {}
    if (doctor.socialTokens) {
      try { tokens = JSON.parse(doctor.socialTokens) } catch { /* ignore */ }
    }

    tokens.linkedin = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      userId: liUserId,
      expiresAt,
    }

    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { socialTokens: JSON.stringify(tokens) },
    })

    return NextResponse.redirect(`${origin}/integraciones?success=linkedin`)
  } catch (err) {
    console.error('[LINKEDIN OAUTH]', err)
    return NextResponse.redirect(`${origin}/integraciones?error=linkedin_failed`)
  }
}
