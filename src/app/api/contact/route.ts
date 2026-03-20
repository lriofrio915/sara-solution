import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { slug, name, phone, email, message } = await req.json()

    if (!slug || !name || !phone) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const doctor = await prisma.doctor.findUnique({
      where: { slug },
      select: { id: true, name: true, webhookUrl: true },
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

    // Fire webhook asynchronously if configured
    if (doctor.webhookUrl) {
      fetch(doctor.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorName: doctor.name,
          doctorSlug: slug,
          patientName: name.trim(),
          patientPhone: phone.trim(),
          patientEmail: email?.trim() || null,
          message: message?.trim() || null,
          source: 'FORMULARIO',
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10000),
      }).catch(err => console.error(`[Contact] Webhook ${slug} error:`, err?.message))
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Contact] Error:', err?.message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
