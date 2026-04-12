import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, socialTokens: true },
  })
}

interface SocialTokens {
  instagram?: { accessToken: string; userId: string; expiresAt?: string }
  facebook?:  { accessToken: string; userId: string; expiresAt?: string }
  linkedin?:  { accessToken: string; userId: string; expiresAt?: string }
}

// ─── Instagram Graph API ───────────────────────────────────────────────────
async function publishInstagram(token: string, userId: string, content: string, imageUrl?: string | null) {
  if (!imageUrl) throw new Error('Instagram requiere una imagen para publicar')

  // 1. Crear contenedor de media
  const containerRes = await fetch(`https://graph.facebook.com/v19.0/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption: content, access_token: token }),
  })
  const containerData = await containerRes.json()
  if (!containerData.id) throw new Error(`IG media container error: ${JSON.stringify(containerData)}`)

  // 2. Publicar contenedor
  const publishRes = await fetch(`https://graph.facebook.com/v19.0/${userId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
  })
  const publishData = await publishRes.json()
  if (!publishData.id) throw new Error(`IG publish error: ${JSON.stringify(publishData)}`)

  return publishData.id as string
}

// ─── Facebook Graph API ────────────────────────────────────────────────────
async function publishFacebook(token: string, userId: string, content: string, imageUrl?: string | null) {
  if (imageUrl) {
    // Publicar con imagen en Photos
    const res = await fetch(`https://graph.facebook.com/v19.0/${userId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, caption: content, access_token: token }),
    })
    const data = await res.json()
    if (!data.id) throw new Error(`FB photos error: ${JSON.stringify(data)}`)
    return data.id as string
  } else {
    // Publicar solo texto
    const res = await fetch(`https://graph.facebook.com/v19.0/${userId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content, access_token: token }),
    })
    const data = await res.json()
    if (!data.id) throw new Error(`FB feed error: ${JSON.stringify(data)}`)
    return data.id as string
  }
}

// ─── LinkedIn API v2 ───────────────────────────────────────────────────────
async function publishLinkedIn(token: string, userId: string, content: string) {
  const body = {
    author: `urn:li:person:${userId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  const postId = data.id ?? data['x-restli-id'] ?? null
  if (!postId) throw new Error(`LinkedIn post error: ${JSON.stringify(data)}`)
  return postId as string
}

// ─── POST /api/marketing/publish/[id] ─────────────────────────────────────
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const post = await prisma.socialPost.findFirst({
    where: { id: params.id, doctorId: doctor.id },
  })
  if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })

  let tokens: SocialTokens = {}
  if (doctor.socialTokens) {
    try { tokens = JSON.parse(doctor.socialTokens) } catch { /* ignore */ }
  }

  const platform = post.targetPlatform
  const externalIds: Record<string, string> = (post.externalIds as Record<string, string>) ?? {}
  const errors: string[] = []

  function isTokenExpired(expiresAt?: string): boolean {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  try {
    if (platform === 'INSTAGRAM' || platform === 'BOTH') {
      if (!tokens.instagram?.accessToken) {
        errors.push('Instagram: cuenta no conectada')
      } else if (isTokenExpired(tokens.instagram.expiresAt)) {
        errors.push('Instagram: token expirado, reconecta tu cuenta')
      } else {
        try {
          const extId = await publishInstagram(tokens.instagram.accessToken, tokens.instagram.userId, post.content, post.imageUrl)
          externalIds.instagram = extId
        } catch (e) {
          errors.push(`Instagram: ${e instanceof Error ? e.message : 'Error'}`)
        }
      }
    }

    if (platform === 'FACEBOOK' || platform === 'BOTH') {
      if (!tokens.facebook?.accessToken) {
        errors.push('Facebook: cuenta no conectada')
      } else if (isTokenExpired(tokens.facebook.expiresAt)) {
        errors.push('Facebook: token expirado, reconecta tu cuenta')
      } else {
        try {
          const extId = await publishFacebook(tokens.facebook.accessToken, tokens.facebook.userId, post.content, post.imageUrl)
          externalIds.facebook = extId
        } catch (e) {
          errors.push(`Facebook: ${e instanceof Error ? e.message : 'Error'}`)
        }
      }
    }

    if (platform === 'LINKEDIN') {
      if (!tokens.linkedin?.accessToken) {
        errors.push('LinkedIn: cuenta no conectada')
      } else if (isTokenExpired(tokens.linkedin.expiresAt)) {
        errors.push('LinkedIn: token expirado, reconecta tu cuenta')
      } else {
        try {
          const extId = await publishLinkedIn(tokens.linkedin.accessToken, tokens.linkedin.userId, post.content)
          externalIds.linkedin = extId
        } catch (e) {
          errors.push(`LinkedIn: ${e instanceof Error ? e.message : 'Error'}`)
        }
      }
    }

    const allFailed = errors.length > 0 && Object.keys(externalIds).length === 0
    const newStatus = allFailed ? 'FAILED' : 'PUBLISHED'

    const updated = await prisma.socialPost.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        publishedAt: allFailed ? undefined : new Date(),
        externalIds,
      },
    })

    if (errors.length > 0) {
      return NextResponse.json({ post: updated, warnings: errors }, { status: allFailed ? 422 : 207 })
    }
    return NextResponse.json({ post: updated })
  } catch (err) {
    console.error('[PUBLISH]', err)
    await prisma.socialPost.update({
      where: { id: params.id },
      data: { status: 'FAILED' },
    })
    return NextResponse.json({ error: 'Error al publicar' }, { status: 500 })
  }
}
