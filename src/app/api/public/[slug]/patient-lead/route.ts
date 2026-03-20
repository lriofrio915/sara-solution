/**
 * POST /api/public/[slug]/patient-lead
 * Public endpoint — no auth required.
 * Saves a PatientLead for the doctor identified by slug, and fires their
 * webhook (if configured) asynchronously.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { name, phone, email, message, source, campaign } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const doctor = await prisma.doctor.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true, webhookUrl: true, whatsapp: true, phone: true },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    const lead = await prisma.patientLead.create({
      data: {
        doctorId: doctor.id,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        message: message?.trim() || null,
        source: source ?? 'CHAT',
        campaign: campaign ?? null,
        status: 'NUEVO',
      },
    })

    const payload = {
      doctorName: doctor.name,
      doctorSlug: params.slug,
      patientName: name.trim(),
      patientPhone: phone?.trim() || null,
      patientEmail: email?.trim() || null,
      message: message?.trim() || null,
      source: source ?? 'CHAT',
      campaign: campaign ?? null,
      timestamp: new Date().toISOString(),
    }

    // Fire doctor-specific webhook asynchronously (non-blocking)
    if (doctor.webhookUrl) {
      fetch(doctor.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      }).catch(() => { /* non-fatal */ })
    }

    // Fire centralized n8n notification webhook
    const centralUrl = process.env.N8N_DOCTOR_LEAD_NOTIFY_URL
    if (centralUrl) {
      const doctorPhone = doctor.whatsapp || doctor.phone || null
      fetch(centralUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, doctorPhone }),
        signal: AbortSignal.timeout(10000),
      }).catch(() => { /* non-fatal */ })
    }

    return NextResponse.json({ ok: true, id: lead.id })
  } catch (err) {
    console.error('[patient-lead] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
