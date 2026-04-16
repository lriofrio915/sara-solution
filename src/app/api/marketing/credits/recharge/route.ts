import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { CREDIT_PACKAGES } from '@/lib/kie-ai'

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

  const { packageIndex, notes } = await req.json()
  const pkg = CREDIT_PACKAGES[packageIndex as number]
  if (!pkg) return NextResponse.json({ error: 'Paquete inválido' }, { status: 400 })

  const recharge = await prisma.creditRecharge.create({
    data: {
      doctorId: doctor.id,
      credits: pkg.credits,
      amountUsd: pkg.priceUsd,
      status: 'PENDING',
      notes: notes ?? null,
    },
  })

  return NextResponse.json({
    rechargeId: recharge.id,
    credits: pkg.credits,
    amountUsd: pkg.priceUsd,
    status: 'PENDING',
  })
}
