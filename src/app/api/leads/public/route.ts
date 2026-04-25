/**
 * POST /api/leads/public
 * Public endpoint — no auth required. Used by the landing page form and
 * any external integration to submit leads.
 *
 * After creating the lead, fires a fire-and-forget notification to n8n
 * so Luis can receive a WhatsApp alert (N8N_LEAD_NOTIFY_URL env var).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNexusWA } from '@/lib/whatsapp'
import { parseBody } from '@/lib/validation/parseBody'
import { LeadWebhookSchema } from '@/lib/validation/schemas/lead'
import { trackEvent } from '@/lib/posthog/server'

export const dynamic = 'force-dynamic'

const ALLOWED_SOURCES = ['LANDING', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'GOOGLE', 'WHATSAPP', 'REFERIDO', 'OTRO']

async function notifyN8n(lead: {
  name: string
  email: string | null
  phone: string | null
  specialty: string | null
  city: string | null
  source: string
  utmSource: string | null
  createdAt: Date
}) {
  const url = process.env.N8N_LEAD_NOTIFY_URL
  if (!url) return // not configured — silent skip

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:      lead.name,
        email:     lead.email     ?? '—',
        phone:     lead.phone     ?? '—',
        specialty: lead.specialty ?? '—',
        city:      lead.city      ?? '—',
        source:    lead.source,
        utmSource: lead.utmSource ?? 'directo',
        date: new Date(lead.createdAt).toLocaleString('es-EC', {
          timeZone:    'America/Guayaquil',
          day:   '2-digit',
          month: '2-digit',
          year:  'numeric',
          hour:  '2-digit',
          minute:'2-digit',
        }),
      }),
      // Short timeout — never block the API response
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    // Notification failure is non-fatal
    console.warn('n8n lead notification failed (non-fatal)')
  }
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, LeadWebhookSchema)
  if (!parsed.ok) return parsed.response
  const { name, email, phone, specialty, city, source, campaign, utmSource, utmMedium, utmCampaign } = parsed.data

  try {
    const resolvedSource = source && ALLOWED_SOURCES.includes(source) ? source : 'LANDING'

    const lead = await prisma.lead.create({
      data: {
        name,
        email:      email       ?? null,
        phone:      phone       ?? null,
        specialty:  specialty   ?? null,
        city:       city        ?? null,
        source:     resolvedSource,
        campaign:   campaign    ?? utmCampaign ?? null,
        utmSource:  utmSource   ?? null,
        utmMedium:  utmMedium   ?? null,
        utmCampaign:utmCampaign ?? null,
        status:     'NUEVO',
      },
    })

    // Funnel analytics — non-PII properties only
    void trackEvent(`lead-${lead.id}`, 'lead_captured', {
      source: resolvedSource,
      utmSource: utmSource ?? 'directo',
      utmMedium: utmMedium ?? null,
      utmCampaign: utmCampaign ?? null,
      hasEmail: !!email,
      hasPhone: !!phone,
      hasSpecialty: !!specialty,
      hasCity: !!city,
    })

    // Fire-and-forget notifications
    void notifyN8n(lead)
    const fechaLead = new Date(lead.createdAt).toLocaleString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    void sendNexusWA('593996691586',
      `🎯 *Nuevo lead*\n\n👤 ${lead.name}\n📧 ${lead.email ?? '—'}\n📱 ${lead.phone ?? '—'}\n🏥 ${lead.specialty ?? '—'}\n📍 ${lead.city ?? '—'}\n🔗 Fuente: ${lead.source}\n🕐 ${fechaLead}`,
    )

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/leads/public:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
