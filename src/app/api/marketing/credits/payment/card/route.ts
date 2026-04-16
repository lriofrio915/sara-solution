import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { CREDIT_PACKAGES } from '@/lib/kie-ai'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://medsara.app'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })

  const apiKey = process.env.NOWPAYMENTS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Pago con tarjeta no configurado' }, { status: 503 })

  const { packageIndex } = await req.json()
  const pkg = CREDIT_PACKAGES[packageIndex as number]
  if (!pkg) return NextResponse.json({ error: 'Paquete inválido' }, { status: 400 })

  // Pre-create recharge record so we have the ID for order_id
  const recharge = await prisma.creditRecharge.create({
    data: {
      doctorId: doctor.id,
      credits: pkg.credits,
      amountUsd: pkg.priceUsd,
      status: 'PENDING',
      payMethod: 'CARD',
    },
  })

  const res = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: pkg.priceUsd,
      price_currency: 'USD',
      pay_currency: 'USDTBSC',
      ipn_callback_url: `${APP_URL}/api/webhooks/nowpayments`,
      order_id: recharge.id,
      order_description: `${pkg.credits} créditos Sara — Dr. ${doctor.name}`,
      success_url: `${APP_URL}/marketing/social?recharge=success`,
      cancel_url: `${APP_URL}/marketing/social?recharge=cancelled`,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    await prisma.creditRecharge.delete({ where: { id: recharge.id } })
    return NextResponse.json({ error: data.message ?? 'Error al crear invoice' }, { status: 502 })
  }

  return NextResponse.json({ invoiceUrl: data.invoice_url })
}
