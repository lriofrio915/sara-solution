import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendWA } from '@/lib/whatsapp'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const { approved } = await req.json()

  const recharge = await prisma.creditRecharge.findUnique({ where: { id } })
  if (!recharge) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (recharge.status !== 'PENDING') return NextResponse.json({ error: 'Solicitud ya procesada' }, { status: 400 })

  if (approved) {
    await prisma.$transaction([
      prisma.creditRecharge.update({
        where: { id },
        data: { status: 'APPROVED', approvedAt: new Date() },
      }),
      prisma.doctorCredit.upsert({
        where: { doctorId: recharge.doctorId },
        update: { credits: { increment: recharge.credits } },
        create: { doctorId: recharge.doctorId, credits: recharge.credits },
      }),
      prisma.creditTransaction.create({
        data: {
          doctorId: recharge.doctorId,
          type: 'RECHARGE',
          credits: recharge.credits,
          description: `Recarga aprobada — $${recharge.amountUsd} USD (${recharge.credits} créditos)`,
        },
      }),
    ])
    // Notificar al médico por WhatsApp
    const doctor = await prisma.doctor.findUnique({
      where: { id: recharge.doctorId },
      select: { name: true, whatsapp: true, phone: true },
    })
    const waPhone = doctor?.whatsapp ?? doctor?.phone
    if (waPhone) {
      const msg = `✅ *¡Tus créditos Sara han sido acreditados!*\n\n👤 Dr. ${doctor!.name}\n📦 *${recharge.credits} créditos* añadidos a tu cuenta\n\n🚀 Ya puedes usar Sara IA para marketing\n🔗 https://medsara.app/marketing`
      sendWA(waPhone, msg).catch(() => {})
    }
  } else {
    await prisma.creditRecharge.update({
      where: { id },
      data: { status: 'REJECTED' },
    })
  }

  return NextResponse.json({ success: true, approved })
}
