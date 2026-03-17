/**
 * POST /api/leads/public
 * Public endpoint — no auth required. Used by the landing page form and
 * any external integration to submit leads.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ALLOWED_SOURCES = ['LANDING', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'GOOGLE', 'WHATSAPP', 'REFERIDO', 'OTRO']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, specialty, city, source, campaign, utmSource, utmMedium, utmCampaign } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const resolvedSource = ALLOWED_SOURCES.includes(source) ? source : 'LANDING'

    const lead = await prisma.lead.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        specialty: specialty?.trim() || null,
        city: city?.trim() || null,
        source: resolvedSource,
        campaign: campaign?.trim() || utmCampaign?.trim() || null,
        utmSource: utmSource?.trim() || null,
        utmMedium: utmMedium?.trim() || null,
        utmCampaign: utmCampaign?.trim() || null,
        status: 'NUEVO',
      },
    })

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/leads/public:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
