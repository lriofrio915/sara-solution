import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { CREDIT_PACKAGES } from '@/lib/kie-ai'
import { MercadoPagoConfig, Preference } from 'mercadopago'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://medsara.app'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return NextResponse.json({ error: 'Pago con tarjeta no configurado' }, { status: 503 })

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true, email: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })

  const { packageIndex } = await req.json()
  const pkg = CREDIT_PACKAGES[packageIndex as number]
  if (!pkg) return NextResponse.json({ error: 'Paquete inválido' }, { status: 400 })

  const recharge = await prisma.creditRecharge.create({
    data: {
      doctorId: doctor.id,
      credits: pkg.credits,
      amountUsd: pkg.priceUsd,
      status: 'PENDING',
      payMethod: 'CARD',
    },
  })

  const client = new MercadoPagoConfig({ accessToken })
  const preference = new Preference(client)

  let initPoint: string
  try {
    const result = await preference.create({
      body: {
        external_reference: recharge.id,
        items: [{
          id: String(pkg.credits),
          title: `${pkg.credits} créditos Sara AI`,
          quantity: 1,
          unit_price: pkg.priceUsd,
          currency_id: 'USD',
        }],
        payer: { email: doctor.email ?? user.email! },
        notification_url: `${APP_URL}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${APP_URL}/marketing/social?recharge=success`,
          failure: `${APP_URL}/marketing/social?recharge=cancelled`,
          pending: `${APP_URL}/marketing/social?recharge=pending`,
        },
        auto_return: 'approved',
        statement_descriptor: 'Sara AI',
      },
    })
    initPoint = result.init_point!
  } catch (err) {
    await prisma.creditRecharge.delete({ where: { id: recharge.id } })
    const msg = err instanceof Error ? err.message : 'Error al crear preferencia de pago'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  return NextResponse.json({ checkoutUrl: initPoint })
}
