import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/auth/meta/callback — callback OAuth de Meta
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?error=no_auth`)
  }

  const url = new URL(req.url)
  const code  = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=meta_denied`)
  }

  const appId     = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const redirectUri = 'https://www.consultorio.site/api/auth/meta/callback'

  try {
    // 1. Intercambiar code por short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?` +
      `client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    )
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('No access_token en respuesta')

    // 2. Extender a long-lived token (60 días)
    const longRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    )
    const longData = await longRes.json()
    const longToken = longData.access_token ?? tokenData.access_token
    const expiresIn = longData.expires_in ?? 5184000 // 60 días default

    // 3. Obtener user ID de Facebook
    const meRes = await fetch(`https://graph.facebook.com/v22.0/me?access_token=${longToken}`)
    const meData = await meRes.json()
    const fbUserId = meData.id ?? null

    // 4. Obtener Pages y su Instagram Business Account vinculado
    let pageId: string | null = null
    let pageAccessToken: string | null = null
    let igUserId: string | null = null
    try {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v22.0/${fbUserId}/accounts?access_token=${longToken}`
      )
      const pagesData = await pagesRes.json()
      const page = pagesData.data?.[0]
      if (page) {
        // Usar Page ID y Page Access Token para publicar en Facebook
        pageId = page.id
        pageAccessToken = page.access_token
        const igRes = await fetch(
          `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        )
        const igData = await igRes.json()
        igUserId = igData.instagram_business_account?.id ?? null
      }
    } catch { /* Instagram account may not exist */ }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // 5. Guardar tokens en Doctor
    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true, socialTokens: true },
    })
    if (!doctor) throw new Error('Doctor no encontrado')

    let tokens: Record<string, unknown> = {}
    if (doctor.socialTokens) {
      try { tokens = JSON.parse(doctor.socialTokens) } catch { /* ignore */ }
    }

    // Facebook requiere Page ID y Page Access Token (no el user token)
    if (pageId && pageAccessToken) {
      tokens.facebook = { accessToken: pageAccessToken, userId: pageId, expiresAt }
    }
    // Instagram requiere Page Access Token de la página vinculada
    if (igUserId && pageAccessToken) {
      tokens.instagram = { accessToken: pageAccessToken, userId: igUserId, expiresAt }
    }

    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { socialTokens: JSON.stringify(tokens) },
    })

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integraciones?success=meta_connected`)
  } catch (err) {
    console.error('[META OAUTH]', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integraciones?error=meta_failed`)
  }
}
