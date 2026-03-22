import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
}

export async function GET() {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const brand = await prisma.brandProfile.findUnique({
    where: { doctorId: doctor.id },
    include: { images: { orderBy: { createdAt: 'desc' } } },
  })

  return NextResponse.json({ brand })
}

export async function PUT(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const {
    clinicName, specialties, slogan,
    primaryColor, secondaryColor, accentColor,
    tones, targetAudience, excludedTopics,
    instagramUrl, facebookUrl, linkedinUrl,
  } = body

  const brand = await prisma.brandProfile.upsert({
    where: { doctorId: doctor.id },
    create: {
      doctorId: doctor.id,
      clinicName: clinicName ?? null,
      specialties: specialties ?? [],
      slogan: slogan ?? null,
      primaryColor: primaryColor ?? '#2563EB',
      secondaryColor: secondaryColor ?? '#0D9488',
      accentColor: accentColor ?? '#F59E0B',
      tones: tones ?? [],
      targetAudience: targetAudience ?? null,
      excludedTopics: excludedTopics ?? null,
      instagramUrl: instagramUrl ?? null,
      facebookUrl: facebookUrl ?? null,
      linkedinUrl: linkedinUrl ?? null,
    },
    update: {
      clinicName: clinicName ?? null,
      specialties: specialties ?? [],
      slogan: slogan ?? null,
      primaryColor: primaryColor ?? '#2563EB',
      secondaryColor: secondaryColor ?? '#0D9488',
      accentColor: accentColor ?? '#F59E0B',
      tones: tones ?? [],
      targetAudience: targetAudience ?? null,
      excludedTopics: excludedTopics ?? null,
      instagramUrl: instagramUrl ?? null,
      facebookUrl: facebookUrl ?? null,
      linkedinUrl: linkedinUrl ?? null,
    },
  })

  return NextResponse.json({ brand })
}
