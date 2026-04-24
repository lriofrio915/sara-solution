import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseBody } from '@/lib/validation/parseBody'
import { ContactSchema } from '@/lib/validation/schemas/contact'

async function fireWebhook(url: string, payload: Record<string, unknown>) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[Contact] webhook ${url} → HTTP ${res.status}: ${body}`)
    } else {
      console.log(`[Contact] webhook ${url} → OK ${res.status}`)
    }
  } catch (err: any) {
    console.error(`[Contact] webhook ${url} → ERROR: ${err?.message}`)
  }
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, ContactSchema)
  if (!parsed.ok) return parsed.response
  const { slug, name, phone, email, message } = parsed.data

  try {
    const doctor = await prisma.doctor.findUnique({
      where: { slug },
      select: { id: true, name: true, webhookUrl: true, whatsapp: true, phone: true },
    })

    if (!doctor) return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })

    // Always save lead in DB
    await prisma.patientLead.create({
      data: {
        doctorId: doctor.id,
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        message: message?.trim() || null,
        source: 'FORMULARIO',
        campaign: 'formulario-publico',
        status: 'NUEVO',
      },
    })

    const payload = {
      doctorName: doctor.name,
      doctorSlug: slug,
      patientName: name.trim(),
      patientPhone: phone.trim(),
      patientEmail: email?.trim() || null,
      message: message?.trim() || null,
      source: 'FORMULARIO',
      timestamp: new Date().toISOString(),
    }

    const webhookCalls: Promise<void>[] = []

    if (doctor.webhookUrl) {
      webhookCalls.push(fireWebhook(doctor.webhookUrl, payload))
    }

    const centralUrl = process.env.N8N_DOCTOR_LEAD_NOTIFY_URL
    if (centralUrl) {
      const doctorPhone = doctor.whatsapp || doctor.phone || null
      webhookCalls.push(fireWebhook(centralUrl, { ...payload, doctorPhone }))
    }

    // Await both in parallel — ensures webhooks complete before response
    await Promise.allSettled(webhookCalls)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Contact] Error:', err?.message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
