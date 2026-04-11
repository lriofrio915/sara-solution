/**
 * GET /api/cron/publish-scheduled
 * Publishes all SocialPosts with status=SCHEDULED and scheduledAt <= now.
 * Configured to run every 15 minutes via Vercel Cron.
 *
 * Requires header: x-cron-secret: $CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Helpers de publicación (duplicados aquí para mantener el cron independiente)

async function publishInstagram(token: string, userId: string, content: string, imageUrl?: string | null): Promise<string> {
  if (!imageUrl) throw new Error('Instagram requiere imagen')
  const containerRes = await fetch(`https://graph.facebook.com/v19.0/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption: content, access_token: token }),
  })
  const containerData = await containerRes.json()
  if (!containerData.id) throw new Error(`IG container: ${JSON.stringify(containerData)}`)

  const publishRes = await fetch(`https://graph.facebook.com/v19.0/${userId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
  })
  const publishData = await publishRes.json()
  if (!publishData.id) throw new Error(`IG publish: ${JSON.stringify(publishData)}`)
  return publishData.id as string
}

async function publishFacebook(token: string, userId: string, content: string, imageUrl?: string | null): Promise<string> {
  if (imageUrl) {
    const res = await fetch(`https://graph.facebook.com/v19.0/${userId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, caption: content, access_token: token }),
    })
    const data = await res.json()
    if (!data.id) throw new Error(`FB photos: ${JSON.stringify(data)}`)
    return data.id as string
  } else {
    const res = await fetch(`https://graph.facebook.com/v19.0/${userId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content, access_token: token }),
    })
    const data = await res.json()
    if (!data.id) throw new Error(`FB feed: ${JSON.stringify(data)}`)
    return data.id as string
  }
}

async function publishLinkedIn(token: string, userId: string, content: string): Promise<string> {
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${userId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })
  const data = await res.json()
  const postId = data.id ?? data['x-restli-id'] ?? null
  if (!postId) throw new Error(`LinkedIn: ${JSON.stringify(data)}`)
  return postId as string
}

// ─── GET /api/cron/publish-scheduled ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const now = new Date()

  // Buscar todos los posts con scheduledAt <= now y status = SCHEDULED
  const duePosts = await prisma.socialPost.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
    include: { doctor: { select: { socialTokens: true } } },
    take: 50, // procesar hasta 50 por ejecución
  })

  if (duePosts.length === 0) {
    return NextResponse.json({ processed: 0, message: 'Nada que publicar' })
  }

  const results: { id: string; status: string; error?: string }[] = []

  for (const post of duePosts) {
    let tokens: Record<string, { accessToken?: string; userId?: string }> = {}
    if (post.doctor.socialTokens) {
      try { tokens = JSON.parse(post.doctor.socialTokens) } catch { /* ignore */ }
    }

    const externalIds: Record<string, string> = (post.externalIds as Record<string, string>) ?? {}
    const errors: string[] = []

    try {
      const platform = post.targetPlatform

      if ((platform === 'INSTAGRAM' || platform === 'BOTH') && tokens.instagram?.accessToken) {
        try {
          const extId = await publishInstagram(tokens.instagram.accessToken, tokens.instagram.userId!, post.content, post.imageUrl)
          externalIds.instagram = extId
        } catch (e) { errors.push(`IG: ${e instanceof Error ? e.message : 'Error'}`) }
      }

      if ((platform === 'FACEBOOK' || platform === 'BOTH') && tokens.facebook?.accessToken) {
        try {
          const extId = await publishFacebook(tokens.facebook.accessToken, tokens.facebook.userId!, post.content, post.imageUrl)
          externalIds.facebook = extId
        } catch (e) { errors.push(`FB: ${e instanceof Error ? e.message : 'Error'}`) }
      }

      if (platform === 'LINKEDIN' && tokens.linkedin?.accessToken) {
        try {
          const extId = await publishLinkedIn(tokens.linkedin.accessToken, tokens.linkedin.userId!, post.content)
          externalIds.linkedin = extId
        } catch (e) { errors.push(`LI: ${e instanceof Error ? e.message : 'Error'}`) }
      }

      const allFailed = errors.length > 0 && Object.keys(externalIds).filter(k => !Object.keys((post.externalIds as Record<string, string>) ?? {}).includes(k)).length === 0
      const newStatus = allFailed ? 'FAILED' : 'PUBLISHED'

      await prisma.socialPost.update({
        where: { id: post.id },
        data: {
          status: newStatus,
          publishedAt: allFailed ? undefined : new Date(),
          externalIds,
        },
      })

      results.push({ id: post.id, status: newStatus, error: errors.length ? errors.join('; ') : undefined })
    } catch (err) {
      console.error(`[CRON PUBLISH] post ${post.id}:`, err)
      await prisma.socialPost.update({ where: { id: post.id }, data: { status: 'FAILED' } })
      results.push({ id: post.id, status: 'FAILED', error: err instanceof Error ? err.message : 'Error' })
    }
  }

  const published = results.filter(r => r.status === 'PUBLISHED').length
  const failed    = results.filter(r => r.status === 'FAILED').length

  console.log(`[CRON PUBLISH] ${published} publicados, ${failed} fallidos`)
  return NextResponse.json({ processed: duePosts.length, published, failed, results })
}
