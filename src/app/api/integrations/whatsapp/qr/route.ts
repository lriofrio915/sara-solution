/**
 * GET /api/integrations/whatsapp/qr
 * Returns the QR code (base64 image) for the doctor's Evolution instance.
 * Returns { connected: true } when the instance is already connected.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true, evolutionInstance: true },
    })
    if (!doctor?.evolutionInstance) {
      return NextResponse.json({ error: 'No instance configured' }, { status: 404 })
    }

    const evoBase = (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
    const evoKey = process.env.EVOLUTION_API_KEY ?? ''
    const headers = { 'Content-Type': 'application/json', apikey: evoKey }

    // First check connection state — if already open, no QR needed
    const stateRes = await fetch(`${evoBase}/instance/connectionState/${doctor.evolutionInstance}`, { headers })
    if (stateRes.ok) {
      const stateData = await stateRes.json() as { instance?: { state?: string } }
      if (stateData.instance?.state === 'open') {
        return NextResponse.json({ connected: true })
      }
    }

    // Get QR code
    const qrRes = await fetch(`${evoBase}/instance/connect/${doctor.evolutionInstance}`, { headers })
    if (!qrRes.ok) {
      return NextResponse.json({ error: 'No se pudo obtener el QR' }, { status: 502 })
    }

    const qrData = await qrRes.json() as { base64?: string; code?: string; instance?: { state?: string } }

    if (qrData.instance?.state === 'open') {
      return NextResponse.json({ connected: true })
    }

    return NextResponse.json({
      connected: false,
      qr: qrData.base64 ?? null,
    })
  } catch (err) {
    console.error('GET /api/integrations/whatsapp/qr:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
