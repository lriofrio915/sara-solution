/**
 * POST /api/integrations/whatsapp/setup-webhook
 * Re-configures (or creates) the Evolution webhook for the doctor's existing instance.
 * Call this after an instance is created/connected to ensure Sara receives messages.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function evolutionUrl(path: string) {
  return `${(process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')}${path}`
}
function evolutionHeaders() {
  return { 'Content-Type': 'application/json', apikey: process.env.EVOLUTION_API_KEY ?? '' }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true, evolutionInstance: true },
    })
    if (!doctor?.evolutionInstance) {
      return NextResponse.json({ error: 'No tienes una instancia de WhatsApp configurada' }, { status: 400 })
    }

    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'Evolution API no configurada en el servidor' }, { status: 503 })
    }

    const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.INTERNAL_APP_URL ?? ''
    if (!rawUrl) {
      return NextResponse.json({ error: 'APP_URL no configurada en el servidor' }, { status: 503 })
    }
    // Ensure www — Vercel redirects consultorio.site → www.consultorio.site with 307
    // but Evolution doesn't follow POST redirects, so we must use the final URL directly
    const appUrl = rawUrl.replace(/^https?:\/\/(?!www\.)/, (m) => m + 'www.')
    const webhookUrl = `${appUrl}/api/webhooks/whatsapp-evolution`
    const instanceName = doctor.evolutionInstance

    const res = await fetch(evolutionUrl(`/webhook/set/${instanceName}`), {
      method: 'POST',
      headers: evolutionHeaders(),
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: true,
          base64: false,
          events: ['MESSAGES_UPSERT'],
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      let detail = text
      try {
        const parsed = JSON.parse(text)
        detail = parsed.message ?? parsed.error ?? text
      } catch { /* keep raw */ }
      return NextResponse.json(
        { error: `Error ${res.status} al configurar webhook en Evolution: ${detail}` },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, webhookUrl, instanceName })
  } catch (err) {
    console.error('POST /api/integrations/whatsapp/setup-webhook:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
