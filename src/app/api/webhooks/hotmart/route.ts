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

export const dynamic = 'force-dynamic'

function validateHottok(req: NextRequest): boolean {
  const hottok = req.headers.get('x-hotmart-hottok')
  if (!process.env.HOTMART_HOTTOK || !hottok) return false
  return hottok === process.env.HOTMART_HOTTOK
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
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
