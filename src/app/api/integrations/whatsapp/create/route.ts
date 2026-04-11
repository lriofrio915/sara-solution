/**
 * POST /api/integrations/whatsapp/create
 * Creates an Evolution instance for the doctor, saves it to DB,
 * and auto-configures the webhook URL.
 *
 * Body: { instanceName: string }
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

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true, evolutionInstance: true },
    })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const body = await req.json() as { instanceName?: string }
    const instanceName = body.instanceName?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
    if (!instanceName || instanceName.length < 3) {
      return NextResponse.json({ error: 'Nombre de instancia inválido (mínimo 3 caracteres, solo letras, números y guiones)' }, { status: 400 })
    }

    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'Evolution API no configurada en el servidor' }, { status: 503 })
    }

    // ── 1. Create Evolution instance ─────────────────────────────────────────
    const createRes = await fetch(evolutionUrl('/instance/create'), {
      method: 'POST',
      headers: evolutionHeaders(),
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    })

    if (!createRes.ok) {
      const errorText = await createRes.text()
      console.error('Evolution create error:', errorText)
      // Instance may already exist — treat as OK and proceed
      if (!errorText.includes('already') && createRes.status !== 409) {
        return NextResponse.json({ error: 'No se pudo crear la instancia en Evolution API' }, { status: 502 })
      }
    }

    // ── 2. Save to DB ────────────────────────────────────────────────────────
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { evolutionInstance: instanceName },
    })

    // ── 3. Auto-configure webhook ────────────────────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.INTERNAL_APP_URL ?? ''
    if (appUrl) {
      const webhookUrl = `${appUrl}/api/webhooks/whatsapp-evolution`
      fetch(evolutionUrl(`/webhook/set/${instanceName}`), {
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
      }).catch((err) => console.error('Webhook config error (non-fatal):', err))
    }

    return NextResponse.json({ ok: true, instanceName })
  } catch (err) {
    console.error('POST /api/integrations/whatsapp/create:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
