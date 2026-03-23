import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateAutopilotCalendar } from '@/lib/marketing-ai'
import type { SocialPlatform } from '@prisma/client'

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true, specialty: true },
  })
}

/** Computes the list of scheduled dates based on frequency and date range.
 *  postsPerPeriod = posts per day/week/biweek/month.
 *  Returns up to 60 YYYY-MM-DD strings. */
function computeSchedule(
  startDate: string,
  endDate: string,
  frequency: string,
  postsPerPeriod: number,
): string[] {
  const start = new Date(startDate + 'T12:00:00')
  const end   = new Date(endDate   + 'T12:00:00')
  const dates: string[] = []
  const MAX = 60

  if (frequency === 'DAILY') {
    const cur = new Date(start)
    while (cur <= end && dates.length < MAX) {
      for (let i = 0; i < postsPerPeriod && dates.length < MAX; i++) {
        dates.push(cur.toISOString().slice(0, 10))
      }
      cur.setDate(cur.getDate() + 1)
    }
    return dates
  }

  const periodDays = frequency === 'WEEKLY' ? 7 : frequency === 'BIWEEKLY' ? 14 : 30
  const cur = new Date(start)

  while (cur <= end && dates.length < MAX) {
    for (let i = 0; i < postsPerPeriod && dates.length < MAX; i++) {
      const d = new Date(cur)
      // Spread evenly across period, avoiding day 0 overlap when >1 post
      const offset = postsPerPeriod > 1 ? Math.floor(i * (periodDays - 1) / (postsPerPeriod - 1)) : 0
      d.setDate(d.getDate() + offset)
      if (d <= end) dates.push(d.toISOString().slice(0, 10))
    }
    if (frequency === 'MONTHLY') {
      cur.setMonth(cur.getMonth() + 1)
    } else {
      cur.setDate(cur.getDate() + periodDays)
    }
  }

  return dates
}

export async function POST(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { frequency = 'MONTHLY', postsPerPeriod = 4, startDate, endDate, title, platforms } = body

  if (!startDate) return NextResponse.json({ error: 'startDate requerido' }, { status: 400 })
  if (!endDate)   return NextResponse.json({ error: 'endDate requerido' },   { status: 400 })

  const scheduledDates = computeSchedule(startDate, endDate, frequency, Math.min(Number(postsPerPeriod), 10))

  if (!scheduledDates.length) {
    return NextResponse.json({ error: 'El rango de fechas no genera ningún post' }, { status: 400 })
  }

  const brand = await prisma.brandProfile.findUnique({ where: { doctorId: doctor.id } })
  const brandContext = {
    clinicName: brand?.clinicName ?? null,
    doctorName: doctor.name,
    specialties: brand?.specialties?.length ? brand.specialties : [doctor.specialty],
    slogan: brand?.slogan ?? null,
    tones: brand?.tones ?? [],
    targetAudience: brand?.targetAudience ?? null,
    excludedTopics: brand?.excludedTopics ?? null,
  }

  try {
    const selectedPlatforms: string[] = Array.isArray(platforms) && platforms.length > 0
      ? platforms
      : ['INSTAGRAM']

    const autopilotPosts = await generateAutopilotCalendar({
      brand: brandContext,
      frequency: frequency as 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
      scheduledDates,
      platforms: selectedPlatforms,
    })

    if (!autopilotPosts.length) {
      return NextResponse.json({ error: 'No se pudo generar el calendario' }, { status: 500 })
    }

    // Create calendar + posts + items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const calendar = await tx.contentCalendar.create({
        data: {
          doctorId: doctor.id,
          title: title ?? `Calendario ${frequency} - ${startDate}`,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          frequency,
        },
      })

      const createdPosts = []
      for (let i = 0; i < autopilotPosts.length; i++) {
        const ap = autopilotPosts[i]
        // Use pre-computed date — override whatever AI returned
        const postDate = scheduledDates[i] ?? scheduledDates[scheduledDates.length - 1]
        const postPlatform = ((ap.platform && selectedPlatforms.includes(ap.platform))
          ? ap.platform
          : selectedPlatforms[i % selectedPlatforms.length]) as SocialPlatform

        const post = await tx.socialPost.create({
          data: {
            doctorId: doctor.id,
            content: ap.content,
            platforms: [postPlatform] as SocialPlatform[],
            hashtags: ap.hashtags ?? [],
            status: 'DRAFT',
            contentType: ap.contentType ?? 'POST',
            targetPlatform: postPlatform,
            topic: ap.topic,
            imagePrompt: ap.imagePrompt ?? null,
            suggestedTime: ap.suggestedTime ?? null,
            carouselSlides: ap.carouselSlides ? ap.carouselSlides : undefined,
            reelScript: ap.reelScript ?? null,
            scheduledAt: new Date(postDate),
            aiGenerated: true,
          },
        })

        await tx.calendarItem.create({
          data: {
            calendarId: calendar.id,
            socialPostId: post.id,
            scheduledDate: new Date(postDate),
            order: i,
          },
        })

        createdPosts.push(post)
      }

      return { calendar, posts: createdPosts }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error('Autopilot error:', err)
    return NextResponse.json({ error: 'Error al generar el calendario' }, { status: 500 })
  }
}

export async function GET() {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const calendars = await prisma.contentCalendar.findMany({
    where: { doctorId: doctor.id },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        orderBy: { order: 'asc' },
        include: {
          socialPost: {
            select: {
              id: true, content: true, status: true,
              contentType: true, topic: true, scheduledAt: true,
              hashtags: true, suggestedTime: true, targetPlatform: true, imagePrompt: true,
            },
          },
        },
      },
    },
  })

  return NextResponse.json({ calendars })
}

export async function DELETE(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const calendarId = searchParams.get('calendarId')
  const postId = searchParams.get('postId')

  // Delete individual post from calendar
  if (postId) {
    const post = await prisma.socialPost.findFirst({
      where: { id: postId, doctorId: doctor.id },
    })
    if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    await prisma.$transaction([
      prisma.calendarItem.deleteMany({ where: { socialPostId: postId } }),
      prisma.socialPost.delete({ where: { id: postId } }),
    ])
    return NextResponse.json({ ok: true })
  }

  // Delete entire calendar
  if (calendarId) {
    const calendar = await prisma.contentCalendar.findFirst({
      where: { id: calendarId, doctorId: doctor.id },
      include: { items: { select: { socialPostId: true } } },
    })
    if (!calendar) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    const postIds = calendar.items.map(i => i.socialPostId)
    await prisma.$transaction([
      prisma.calendarItem.deleteMany({ where: { calendarId } }),
      prisma.contentCalendar.delete({ where: { id: calendarId } }),
      prisma.socialPost.deleteMany({ where: { id: { in: postIds } } }),
    ])
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Parámetro requerido' }, { status: 400 })
}
