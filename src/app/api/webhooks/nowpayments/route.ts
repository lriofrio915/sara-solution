import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// NOWPayments IPN webhook — auto-approves credit recharge on confirmed payment
export async function POST(req: Request) {
  const body = await req.text()

  // Verify HMAC signature
  const secret = process.env.NOWPAYMENTS_IPN_SECRET
  if (secret) {
    const sig = req.headers.get('x-nowpayments-sig')
    if (sig) {
      const hmac = crypto.createHmac('sha512', secret)
      const expected = hmac.update(body).digest('hex')
      if (expected !== sig) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { payment_status, order_id } = payload as { payment_status?: string; order_id?: string }

  if (payment_status !== 'finished' || !order_id) {
    return NextResponse.json({ ok: true }) // ignore non-final states
  }

  const recharge = await prisma.creditRecharge.findUnique({ where: { id: order_id } })
  if (!recharge || recharge.status !== 'PENDING') {
    return NextResponse.json({ ok: true })
  }

  // Approve: mark recharge + add credits
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
        description: `Recarga ${recharge.credits} cr. (tarjeta · NOWPayments)`,
      },
    }),
  ])

  return NextResponse.json({ ok: true })
}
