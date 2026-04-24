/**
 * POST /api/webhooks/hotmart
 *
 * Recibe notificaciones de Hotmart cuando un médico compra, cancela o
 * solicita reembolso. Activa o revoca el plan automáticamente.
 *
 * Seguridad: Hotmart envía el header X-Hotmart-Hottok con el secreto
 * configurado en el dashboard de Hotmart → Configuración → Webhooks.
 *
 * Variables de entorno requeridas:
 *   HOTMART_HOTTOK                — secreto del webhook (configurado en Hotmart)
 *   HOTMART_PRODUCT_ID_MONTHLY    — 7359716 (Pro Mensual)
 *   HOTMART_PRODUCT_ID_ANNUAL     — 7418220 (Pro Anual)
 *   HOTMART_PRODUCT_ID_ENTERPRISE — 7360028 (Enterprise)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNexusWA } from '@/lib/whatsapp'
import { parseBody } from '@/lib/validation/parseBody'
import { HotmartWebhookSchema } from '@/lib/validation/schemas/hotmart'
import { timingSafeStringEqual } from '@/lib/timingSafeEqual'

export const dynamic = 'force-dynamic'

function validateHottok(req: NextRequest): boolean {
  const hottok = req.headers.get('x-hotmart-hottok')
  return timingSafeStringEqual(hottok, process.env.HOTMART_HOTTOK)
}

function creditsFromProductId(productId: number | string): { credits: number } | null {
  const id = String(productId)
  if (process.env.HOTMART_PRODUCT_ID_CREDITS_5  && id === process.env.HOTMART_PRODUCT_ID_CREDITS_5)  return { credits: 100 }
  if (process.env.HOTMART_PRODUCT_ID_CREDITS_10 && id === process.env.HOTMART_PRODUCT_ID_CREDITS_10) return { credits: 250 }
  return null
}

function planFromProductId(productId: number | string): 'PRO_MENSUAL' | 'PRO_ANUAL' | 'ENTERPRISE' | null {
  const id = String(productId)
  if (process.env.HOTMART_PRODUCT_ID_MONTHLY && id === process.env.HOTMART_PRODUCT_ID_MONTHLY) {
    return 'PRO_MENSUAL'
  }
  if (process.env.HOTMART_PRODUCT_ID_ANNUAL && id === process.env.HOTMART_PRODUCT_ID_ANNUAL) {
    return 'PRO_ANUAL'
  }
  if (process.env.HOTMART_PRODUCT_ID_ENTERPRISE && id === process.env.HOTMART_PRODUCT_ID_ENTERPRISE) {
    return 'ENTERPRISE'
  }
  return null
}

export async function GET(req: NextRequest) {
  // Ping de verificación desde el dashboard de Hotmart
  if (!validateHottok(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, message: 'Sara Medical Hotmart webhook activo' })
}

export async function POST(req: NextRequest) {
  if (!validateHottok(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = await parseBody(req, HotmartWebhookSchema)
  if (!parsed.ok) return parsed.response
  const payload = parsed.data as Record<string, unknown>
  const event = payload?.event as string | undefined
  const data = payload?.data as Record<string, unknown> | undefined
  const product = data?.product as Record<string, unknown> | undefined
  const buyer = data?.buyer as Record<string, unknown> | undefined

  const buyerEmail = buyer?.email as string | undefined
  const productId = product?.id

  if (!buyerEmail) {
    console.error('Hotmart webhook: buyer.email ausente', JSON.stringify(payload))
    return NextResponse.json({ error: 'buyer.email missing' }, { status: 400 })
  }

  const email = buyerEmail.toLowerCase().trim()

  switch (event) {
    case 'PURCHASE_COMPLETE':
    case 'PURCHASE_APPROVED': {
      // Credits recharge takes priority over plan products
      const creditPkg = creditsFromProductId(productId as number | string)
      if (creditPkg) {
        const doctor = await prisma.doctor.findFirst({ where: { email }, select: { id: true } })
        if (!doctor) {
          console.warn(`Hotmart webhook (credits): médico no encontrado para email ${email}`)
          return NextResponse.json({ ok: true, skipped: 'doctor_not_found' })
        }
        await prisma.$transaction([
          prisma.creditRecharge.create({
            data: { doctorId: doctor.id, credits: creditPkg.credits, amountUsd: 0, status: 'APPROVED', payMethod: 'CARD', approvedAt: new Date() },
          }),
          prisma.doctorCredit.upsert({
            where: { doctorId: doctor.id },
            create: { doctorId: doctor.id, credits: creditPkg.credits },
            update: { credits: { increment: creditPkg.credits } },
          }),
          prisma.creditTransaction.create({
            data: { doctorId: doctor.id, type: 'RECHARGE', credits: creditPkg.credits, description: `Recarga ${creditPkg.credits} cr. (Hotmart)` },
          }),
        ])
        console.log(`Hotmart: ${creditPkg.credits} créditos activados para ${email}`)
        const fechaCredits = new Date().toLocaleString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        sendNexusWA('593996691586',
          `💳 *Compra de créditos vía Hotmart*\n\n📧 ${email}\n📦 ${creditPkg.credits} créditos activados\n🕐 ${fechaCredits}`,
        ).catch(() => {})
        return NextResponse.json({ ok: true, credits: creditPkg.credits })
      }

      const plan = planFromProductId(productId as number | string)
      if (!plan) {
        console.warn(`Hotmart webhook: product ID desconocido: ${productId} (email: ${email})`)
        // Responder 200 para que Hotmart no reintente — no es un error nuestro
        return NextResponse.json({ ok: true, skipped: 'unknown_product' })
      }

      const updated = await prisma.doctor.updateMany({
        where: { email },
        data: { plan, trialEndsAt: null },
      })

      if (updated.count === 0) {
        console.warn(`Hotmart webhook: médico no encontrado para email ${email}`)
        // 200 para no causar reintentos — puede ser un comprador nuevo aún sin cuenta
        return NextResponse.json({ ok: true, skipped: 'doctor_not_found' })
      }

      console.log(`Hotmart: plan ${plan} activado para ${email}`)
      const fechaPlan = new Date().toLocaleString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      sendNexusWA('593996691586',
        `⭐ *Nueva membresía activada (Hotmart)*\n\n📧 ${email}\n📋 Plan: ${plan}\n🕐 ${fechaPlan}\n\n🔗 https://medsara.app/admin`,
      ).catch(() => {})
      return NextResponse.json({ ok: true, plan })
    }

    case 'PURCHASE_CANCELED':
    case 'PURCHASE_REFUNDED':
    case 'PURCHASE_CHARGEBACK':
    case 'SUBSCRIPTION_CANCELLATION': {
      await prisma.doctor.updateMany({
        where: { email },
        data: { plan: 'FREE', trialEndsAt: null },
      })

      console.log(`Hotmart: plan revertido a FREE para ${email} (evento: ${event})`)
      return NextResponse.json({ ok: true, plan: 'FREE' })
    }

    default:
      // Evento desconocido — acusar recibo sin acción
      console.log(`Hotmart webhook: evento ignorado: ${event}`)
      return NextResponse.json({ ok: true, skipped: `unknown_event:${event}` })
  }
}
