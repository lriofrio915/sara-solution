/**
 * POST /api/onboarding/whatsapp — funnel de registro de MÉDICOS por WhatsApp.
 *
 * Distinto de /api/sara/whatsapp (que atiende PACIENTES): aquí el que escribe
 * es un médico prospecto que quiere probar Sara Medical. Sara le pide nombre,
 * especialidad y email, crea un Lead (visible en el CRM desde el primer
 * mensaje) y le envía un link de /register pre-llenado con trial de 21 días.
 *
 * Conectar en n8n/Evolution: los mensajes entrantes del número Nexus se
 * enrutan aquí con header `x-api-secret: <WHATSAPP_API_SECRET>`.
 * Body: { phone, message, pushName } — Returns: { reply }
 *
 * Estado de la conversación: JSON en Lead.notes (campaign 'wa-onboarding').
 * Sin cambios de schema.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseBody } from '@/lib/validation/parseBody'
import { WaOnboardingSchema } from '@/lib/validation/schemas/waOnboarding'
import { timingSafeStringEqual } from '@/lib/timingSafeEqual'
import { sendNexusWA } from '@/lib/whatsapp'
import { greeting, advance, parseState, serializeState } from '@/lib/wa-onboarding'

export const dynamic = 'force-dynamic'

const CAMPAIGN = 'wa-onboarding'
const ADMIN_PHONE = process.env.NEXUS_ADMIN_PHONE ?? '593996691586'

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.consultorio.site').replace(/\/$/, '')
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-api-secret')
    if (!timingSafeStringEqual(secret, process.env.WHATSAPP_API_SECRET)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = await parseBody(req, WaOnboardingSchema)
    if (!parsed.ok) return parsed.response
    const { phone, message, pushName } = parsed.data

    const cleanPhone = phone.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    if (cleanPhone.length < 7) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    }
    const waPhone = `+${cleanPhone}`

    // Lead existente de este funnel (estado en notes)
    const lead = await prisma.lead.findFirst({
      where: { phone: waPhone, campaign: CAMPAIGN },
      orderBy: { createdAt: 'desc' },
    })

    // ── Primer contacto: crear Lead + saludar ────────────────────────────────
    const state = parseState(lead?.notes)
    if (!lead || !state) {
      const g = greeting(pushName)
      if (!lead) {
        await prisma.lead.create({
          data: {
            name: pushName?.trim() || `Prospecto WhatsApp ${waPhone}`,
            phone: waPhone,
            source: 'WHATSAPP',
            campaign: CAMPAIGN,
            utmSource: 'whatsapp',
            utmCampaign: CAMPAIGN,
            status: 'NUEVO',
            notes: serializeState(g.state),
          },
        })
      } else {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { notes: serializeState(g.state) },
        })
      }
      return NextResponse.json({ reply: g.reply })
    }

    // ── Conversación en curso: avanzar la máquina de estados ────────────────
    const result = advance(state, message, cleanPhone, appUrl())

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        notes: serializeState(result.state),
        ...(result.state.name ? { name: result.state.name } : {}),
        ...(result.state.specialty ? { specialty: result.state.specialty } : {}),
        ...(result.state.email ? { email: result.state.email } : {}),
        // Dio todos sus datos y recibió el link → lead calificado
        ...(result.justCompleted ? { status: 'INTERESADO' } : {}),
      },
    })

    // Notificaciones al admin (no bloquean la respuesta al prospecto)
    if (result.justCompleted) {
      sendNexusWA(
        ADMIN_PHONE,
        `🚀 *Funnel WhatsApp: médico completó pre-registro*\n\n` +
          `👤 ${result.state.name}\n🏥 ${result.state.specialty}\n📧 ${result.state.email}\n📱 ${waPhone}\n\n` +
          `Link de registro enviado. Ver en CRM: ${appUrl()}/admin/leads`,
      ).catch(() => {/* non-critical */})
    } else if (result.humanRequested) {
      sendNexusWA(
        ADMIN_PHONE,
        `🙋 *Funnel WhatsApp: prospecto pide hablar con una persona*\n\n📱 ${waPhone}\n` +
          `${result.state.name ? `👤 ${result.state.name}\n` : ''}` +
          `Escríbele directo por WhatsApp.`,
      ).catch(() => {/* non-critical */})
    }

    return NextResponse.json({ reply: result.reply })
  } catch (err) {
    console.error('POST /api/onboarding/whatsapp:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
