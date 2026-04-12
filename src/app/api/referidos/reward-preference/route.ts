import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/referidos/reward-preference — update doctor reward preference
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { preference } = body
  if (!preference || !['FREE_MONTH', 'CASH'].includes(preference)) {
    return NextResponse.json({ error: 'Preferencia inválida' }, { status: 400 })
  }

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })

  await prisma.doctor.update({
    where: { id: doctor.id },
    data: { rewardPreference: preference },
  })

  return NextResponse.json({ ok: true })
}
