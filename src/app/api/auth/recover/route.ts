import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { TRIAL_DAYS } from '@/lib/plan'

/**
 * POST /api/auth/recover
 *
 * Creates a fresh Doctor record for an authenticated user who has no Doctor row
 * (e.g. after a data-loss event). Safe to call multiple times — if the Doctor
 * already exists it returns 200 without modifying anything.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Already has a doctor record → nothing to do
    const existing = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ recovered: false, message: 'El perfil ya existe' })
    }

    // Derive name from Supabase user metadata
    const fullName: string =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.email?.split('@')[0] ?? 'Médico')

    const slug = fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    const doctor = await prisma.doctor.create({
      data: {
        id: user.id,
        name: fullName,
        email: user.email!,
        specialty: 'General',
        slug: `${slug}-${user.id.slice(0, 6)}`,
        plan: 'TRIAL',
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
        active: true,
      },
    })

    return NextResponse.json({ recovered: true, doctorId: doctor.id }, { status: 201 })
  } catch (error) {
    console.error('Error en recover:', error)
    return NextResponse.json({ error: 'Error interno', details: String(error) }, { status: 500 })
  }
}
