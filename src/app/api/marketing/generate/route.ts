import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateMarketingContent } from '@/lib/marketing-ai'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getDoctor(userId: string, userEmail: string) {
  return prisma.doctor.findFirst({
    where: { OR: [{ id: userId }, { email: userEmail }] },
    select: { id: true, name: true, specialty: true },
  })
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const doctor = await getDoctor(user.id, user.email!)
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { topic, contentType, targetPlatform, extraInstructions } = body

  if (!topic?.trim()) return NextResponse.json({ error: 'El tema es requerido' }, { status: 400 })

  // ── Contexto de marca para Luis (admin Sara Medical) ───────────────────────
  let brandContext
  if (user.email === SUPERADMIN_EMAIL) {
    brandContext = {
      clinicName: 'Sara Medical',
      doctorName: 'Luis Riofrio',
      specialties: ['Software médico con IA', 'Gestión de consultorios', 'Salud digital'],
      slogan: 'El asistente médico que trabaja 24/7 por ti',
      tones: ['inspirador', 'cercano', 'disruptivo', 'auténtico'],
      targetAudience: 'Médicos que tienen consultorio propio o clínica y quieren automatizar su administración y captar más pacientes',
      excludedTopics: 'temas clínicos o diagnósticos médicos',
    }
  } else {
    // ── Contexto normal: marca del médico ─────────────────────────────────────
    const brand = await prisma.brandProfile.findUnique({
      where: { doctorId: doctor.id },
    })
    brandContext = {
      clinicName: brand?.clinicName ?? null,
      doctorName: doctor.name,
      specialties: brand?.specialties?.length ? brand.specialties : [doctor.specialty],
      slogan: brand?.slogan ?? null,
      tones: brand?.tones ?? [],
      targetAudience: brand?.targetAudience ?? null,
      excludedTopics: brand?.excludedTopics ?? null,
    }
  }

  try {
    const generated = await generateMarketingContent({
      topic,
      contentType: contentType ?? 'POST',
      targetPlatform: targetPlatform ?? 'INSTAGRAM',
      brand: brandContext,
      extraInstructions,
    })

    // Save as draft SocialPost
    const post = await prisma.socialPost.create({
      data: {
        doctorId: doctor.id,
        content: generated.content,
        platforms: [targetPlatform ?? 'INSTAGRAM'],
        hashtags: generated.hashtags ?? [],
        status: 'DRAFT',
        contentType: contentType ?? 'POST',
        targetPlatform: targetPlatform ?? 'INSTAGRAM',
        topic,
        carouselSlides: generated.carouselSlides ? generated.carouselSlides : undefined,
        reelScript: generated.reelScript ?? null,
        imagePrompt: generated.imagePrompt ?? null,
        suggestedTime: generated.suggestedTime ?? null,
        aiGenerated: true,
      },
    })

    return NextResponse.json({ post, generated })
  } catch (err) {
    console.error('Marketing generate error:', err)
    return NextResponse.json({ error: 'Error al generar contenido' }, { status: 500 })
  }
}
