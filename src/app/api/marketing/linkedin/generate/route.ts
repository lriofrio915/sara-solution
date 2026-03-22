import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateLinkedInPost, type LinkedInStrategy } from '@/lib/linkedin-ai'

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true, specialty: true },
  })
}

export async function POST(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { topic, strategy = 'B2C', trendContext, extraInstructions, trendingTopicId } = body

  if (!topic?.trim()) return NextResponse.json({ error: 'El tema es requerido' }, { status: 400 })

  const brand = await prisma.brandProfile.findUnique({ where: { doctorId: doctor.id } })

  const brandContext = {
    clinicName: brand?.clinicName ?? null,
    doctorName: doctor.name,
    specialties: brand?.specialties?.length ? brand.specialties : [doctor.specialty],
    slogan: brand?.slogan ?? null,
    tones: brand?.tones ?? [],
    targetAudience: brand?.targetAudience ?? null,
    excludedTopics: brand?.excludedTopics ?? null,
    primaryColor: brand?.primaryColor,
  }

  try {
    const generated = await generateLinkedInPost({
      topic,
      strategy: strategy as LinkedInStrategy,
      brand: brandContext,
      trendContext: trendContext ?? undefined,
      extraInstructions: extraInstructions ?? undefined,
    })

    // Guardar como DRAFT en SocialPost
    const post = await prisma.socialPost.create({
      data: {
        doctorId: doctor.id,
        content: generated.content,
        platforms: ['LINKEDIN'],
        hashtags: generated.hashtags ?? [],
        status: 'DRAFT',
        contentType: 'POST',
        targetPlatform: 'LINKEDIN',
        topic,
        imagePrompt: generated.imagePrompt ?? null,
        suggestedTime: generated.suggestedTime ?? null,
        aiGenerated: true,
        linkedinStrategy: strategy,
      },
    })

    // Marcar trending topic como usado si aplica
    if (trendingTopicId) {
      // Solo registramos que fue usado reduciendo su relevance para no repetirlo
      await prisma.trendingTopic.update({
        where: { id: trendingTopicId },
        data: { relevance: { decrement: 0.3 } },
      }).catch(() => null)
    }

    return NextResponse.json({ post, generated })
  } catch (err) {
    console.error('LinkedIn generate error:', err)
    return NextResponse.json({ error: 'Error al generar contenido' }, { status: 500 })
  }
}
