/**
 * GET  /api/integrations/whatsapp — connection status for this doctor's instance
 * DELETE /api/integrations/whatsapp — disconnect and delete the instance
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getDoctor(userId: string, userEmail: string) {
  return prisma.doctor.findFirst({
    where: { OR: [{ id: userId }, { email: userEmail }] },
    select: { id: true, evolutionInstance: true },
  })
}

async function evolutionFetch(path: string, options: RequestInit = {}) {
  const url = process.env.EVOLUTION_API_URL
  const key = process.env.EVOLUTION_API_KEY
  if (!url || !key) throw new Error('Evolution API not configured')
  const res = await fetch(`${url.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', apikey: key, ...(options.headers ?? {}) },
  })
  return res
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctor(user.id, user.email!)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    if (!doctor.evolutionInstance) {
      return NextResponse.json({ evolutionInstance: null, connectionState: null, phoneNumber: null })
    }

    // Get connection state from Evolution
    try {
      const res = await evolutionFetch(`/instance/connectionState/${doctor.evolutionInstance}`)
      if (!res.ok) {
        return NextResponse.json({ evolutionInstance: doctor.evolutionInstance, connectionState: 'unknown', phoneNumber: null })
      }
      const data = await res.json() as { instance?: { state?: string; owner?: string } }
      const state = data.instance?.state ?? 'unknown'
      // owner is the phone number when connected (format: 593999...@s.whatsapp.net)
      const phoneNumber = data.instance?.owner
        ? data.instance.owner.replace('@s.whatsapp.net', '').replace(/\D/g, '')
        : null

      return NextResponse.json({
        evolutionInstance: doctor.evolutionInstance,
        connectionState: state,
        phoneNumber,
      })
    } catch {
      return NextResponse.json({
        evolutionInstance: doctor.evolutionInstance,
        connectionState: 'unknown',
        phoneNumber: null,
      })
    }

  } catch (err) {
    console.error('GET /api/integrations/whatsapp:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctor(user.id, user.email!)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    if (!doctor.evolutionInstance) return NextResponse.json({ ok: true })

    // Delete Evolution instance (best-effort)
    try {
      await evolutionFetch(`/instance/delete/${doctor.evolutionInstance}`, { method: 'DELETE' })
    } catch {
      // non-fatal — clear our DB record regardless
    }

    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { evolutionInstance: null },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/integrations/whatsapp:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
