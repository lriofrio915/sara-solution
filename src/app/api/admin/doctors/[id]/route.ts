import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Plan } from '@prisma/client'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'
const VALID_PLANS: Plan[] = ['FREE', 'TRIAL', 'PRO_MENSUAL', 'PRO_ANUAL', 'ENTERPRISE']

async function authorize() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== SUPERADMIN_EMAIL) return null
  return user
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!await authorize()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.doctor.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!await authorize()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const plan = body.plan as Plan

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  }

  const updated = await prisma.doctor.update({
    where: { id: params.id },
    data: { plan },
    select: { id: true, plan: true },
  })

  return NextResponse.json(updated)
}
