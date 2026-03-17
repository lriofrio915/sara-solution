/**
 * POST /api/leads/webhook
 * Receives leads from n8n automations (Meta Lead Ads, LinkedIn, etc.)
 * Secured with LEADS_WEBHOOK_SECRET header.
 *
 * n8n should send:
 *   Header: x-webhook-secret: <LEADS_WEBHOOK_SECRET env var>
 *   Body: { name, email, phone, specialty, city, source, campaign, utmSource, utmMedium, utmCampaign }
 *
 * source values: INSTAGRAM | FACEBOOK | TIKTOK | LINKEDIN | GOOGLE | WHATSAPP | OTRO
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ALLOWED_SOURCES = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'GOOGLE', 'WHATSAPP', 'REFERIDO', 'OTRO']

export async function GET(req: NextRequest) {
  // n8n webhook test / verification ping
  const secret = req.headers.get('x-webhook-secret')
  if (!process.env.LEADS_WEBHOOK_SECRET || secret !== process.env.LEADS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, message: 'Sara Medical webhook activo' })
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret')
    if (!process.env.LEADS_WEBHOOK_SECRET || secret !== process.env.LEADS_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, phone, specialty, city, source, campaign, utmSource, utmMedium, utmCampaign } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name requerido' }, { status: 400 })
    }

    const resolvedSource = ALLOWED_SOURCES.includes(source?.toUpperCase()) ? source.toUpperCase() : 'OTRO'

    const lead = await prisma.lead.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        specialty: specialty?.trim() || null,
        city: city?.trim() || null,
        source: resolvedSource,
        campaign: campaign?.trim() || null,
        utmSource: utmSource?.trim() || null,
        utmMedium: utmMedium?.trim() || null,
        utmCampaign: utmCampaign?.trim() || null,
        status: 'NUEVO',
      },
    })

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/leads/webhook:', err)
    // Return 200 so n8n doesn't keep retrying on DB errors
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 200 })
  }
}
