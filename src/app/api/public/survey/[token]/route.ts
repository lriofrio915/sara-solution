import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseBody } from '@/lib/validation/parseBody'
import { SurveyAnswerSchema } from '@/lib/validation/schemas/survey'

export const dynamic = 'force-dynamic'

// GET — load survey + doctor info for the public page
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const survey = await prisma.satisfactionSurvey.findUnique({
      where: { token: params.token },
      include: {
        doctor: { select: { name: true, specialty: true, avatarUrl: true } },
        appointment: { select: { date: true } },
      },
    })

    if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      answered: !!survey.answeredAt,
      doctor: survey.doctor,
      appointmentDate: survey.appointment?.date ?? null,
    })
  } catch (err) {
    console.error('GET /api/public/survey/[token]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST — submit survey answer
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const parsed = await parseBody(req, SurveyAnswerSchema)
  if (!parsed.ok) return parsed.response
  const { score, comment, wouldRecommend } = parsed.data

  try {
    const survey = await prisma.satisfactionSurvey.findUnique({ where: { token: params.token } })
    if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (survey.answeredAt) return NextResponse.json({ error: 'Already answered' }, { status: 409 })

    await prisma.satisfactionSurvey.update({
      where: { token: params.token },
      data: {
        score,
        comment: comment ?? null,
        wouldRecommend: wouldRecommend ?? null,
        answeredAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/public/survey/[token]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
