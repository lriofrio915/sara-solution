import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/auth/meta — inicia el flujo OAuth de Meta (Instagram + Facebook)
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const appId     = process.env.META_APP_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`

  if (!appId) {
    return NextResponse.json({ error: 'META_APP_ID no configurado' }, { status: 500 })
  }

  // Scopes necesarios: pages_manage_posts (Facebook pages), instagram_basic, instagram_content_publish
  const scope = [
    'pages_show_list',
    'pages_manage_posts',
    'pages_read_engagement',
    'instagram_business_basic',
    'instagram_business_content_publish',
  ].join(',')

  const url = new URL(req.url)
  const state = url.searchParams.get('state') ?? 'meta_connect'

  const authUrl = new URL('https://www.facebook.com/v22.0/dialog/oauth')
  authUrl.searchParams.set('client_id', appId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(authUrl.toString())
}
