/**
 * POST /api/webhooks/mercadopago
 *
 * Handles MercadoPago payment notifications (webhooks + IPN).
 * Queries the payment directly from the MP API to avoid trusting the payload.
 * Activates credits on approved payment.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MercadoPagoConfig, Payment } from 'mercadopago'

export async function POST(req: NextRequest) {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return NextResponse.json({ ok: true })

  let paymentId: string | null = null

  // Webhooks v2: { type: "payment", data: { id: "xxx" } }
  // IPN fallback: query params ?topic=payment&id=xxx
  try {
    const body = await req.json()
    if (body?.type === 'payment' && body?.data?.id) {
      paymentId = String(body.data.id)
    }
  } catch {
    // not JSON — ignore
  }

  if (!paymentId) {
    paymentId = req.nextUrl.searchParams.get('id')
    const topic = req.nextUrl.searchParams.get('topic')
    if (topic !== 'payment') paymentId = null
  }

  if (!paymentId) return NextResponse.json({ ok: true })

  // Fetch payment status directly from MP API
  const client = new MercadoPagoConfig({ accessToken })
  const mpPayment = new Payment(client)

  let payment: Awaited<ReturnType<typeof mpPayment.get>>
  try {
    payment = await mpPayment.get({ id: paymentId })
  } catch {
    return NextResponse.json({ ok: true })
  }

  if (payment.status !== 'approved') return NextResponse.json({ ok: true })

  const rechargeId = payment.external_reference
  if (!rechargeId) return NextResponse.json({ ok: true })

  const recharge = await prisma.creditRecharge.findUnique({ where: { id: rechargeId } })
  if (!recharge || recharge.status !== 'PENDING') return NextResponse.json({ ok: true })

  await prisma.$transaction([
    prisma.creditRecharge.update({
      where: { id: recharge.id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    }),
    prisma.doctorCredit.upsert({
      where: { doctorId: recharge.doctorId },
      create: { doctorId: recharge.doctorId, credits: recharge.credits },
      update: { credits: { increment: recharge.credits } },
    }),
    prisma.creditTransaction.create({
      data: {
        doctorId: recharge.doctorId,
        type: 'RECHARGE',
        credits: recharge.credits,
        description: `Recarga ${recharge.credits} cr. (tarjeta · MercadoPago #${paymentId})`,
      },
    }),
  ])

  return NextResponse.json({ ok: true })
}
