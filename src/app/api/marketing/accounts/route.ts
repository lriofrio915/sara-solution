import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, socialTokens: true },
  })
  if (!doctor) return null
  return { doctor }
}

// GET /api/marketing/accounts — returns connected account status (no tokens exposed)
export async function GET() {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { doctor } = auth

  let tokens: Record<string, { accessToken?: string; userId?: string; expiresAt?: string }> = {}
  if (doctor.socialTokens) {
    try { tokens = JSON.parse(doctor.socialTokens) } catch { /* ignore */ }
  }

  const accounts = {
    instagram: { connected: !!tokens.instagram?.accessToken, userId: tokens.instagram?.userId ?? null, expiresAt: tokens.instagram?.expiresAt ?? null },
    facebook:  { connected: !!tokens.facebook?.accessToken,  userId: tokens.facebook?.userId  ?? null, expiresAt: tokens.facebook?.expiresAt  ?? null },
    linkedin:  { connected: !!tokens.linkedin?.accessToken,  userId: tokens.linkedin?.userId  ?? null, expiresAt: tokens.linkedin?.expiresAt  ?? null },
    tiktok:    { connected: !!tokens.tiktok?.accessToken,    userId: tokens.tiktok?.userId    ?? null, expiresAt: tokens.tiktok?.expiresAt    ?? null },
  }

  return NextResponse.json({ accounts })
}

// DELETE /api/marketing/accounts?platform=instagram — disconnect account
export async function DELETE(req: Request) {
  const auth = await getAuth()
  const doctor = auth?.doctor
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const platform = url.searchParams.get('platform')
  if (!platform || !['instagram', 'facebook', 'linkedin', 'tiktok'].includes(platform)) {
    return NextResponse.json({ error: 'Plataforma inválida' }, { status: 400 })
  }

  let tokens: Record<string, unknown> = {}
  if (doctor.socialTokens) {
    try { tokens = JSON.parse(doctor.socialTokens) } catch { /* ignore */ }
  }
  delete tokens[platform]

  await prisma.doctor.update({
    where: { id: doctor.id },
    data: { socialTokens: JSON.stringify(tokens) },
  })

  return NextResponse.json({ ok: true })
}
