import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { CREDIT_PACKAGES } from '@/lib/kie-ai'
import { sendWA } from '@/lib/whatsapp'

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true },
  })
}

export async function POST(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { packageIndex, notes, proofUrl, payMethod } = await req.json()
  const pkg = CREDIT_PACKAGES[packageIndex as number]
  if (!pkg) return NextResponse.json({ error: 'Paquete inválido' }, { status: 400 })

  const recharge = await prisma.creditRecharge.create({
    data: {
      doctorId: doctor.id,
      credits: pkg.credits,
      amountUsd: pkg.priceUsd,
      status: 'PENDING',
      notes: notes ?? null,
      proofUrl: proofUrl ?? null,
      payMethod: payMethod ?? null,
    },
  })

  const methodLabel = payMethod === 'TRANSFER' ? 'Transferencia bancaria' : payMethod === 'CRYPTO' ? 'Cripto BEP20' : payMethod === 'CARD' ? 'Tarjeta' : 'No especificado'
  const fechaHora = new Date().toLocaleString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const msg = `💳 *Nueva solicitud de créditos Sara*\n\n👤 Dr. ${doctor.name}\n📦 ${pkg.credits} créditos — $${pkg.priceUsd} USD\n💳 Método: ${methodLabel}${proofUrl ? '\n📎 Comprobante adjunto' : '\n⚠️ Sin comprobante'}${notes ? `\n📝 Nota: ${notes}` : ''}\n🕐 ${fechaHora}\n\n🔗 https://medsara.app/admin/credits`
  sendWA('593996691586', msg).catch(() => {})

  return NextResponse.json({
    rechargeId: recharge.id,
    credits: pkg.credits,
    amountUsd: pkg.priceUsd,
    status: 'PENDING',
  })
}
