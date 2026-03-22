/**
 * POST /api/assistant/switch-doctor
 * Sets the sara-active-doctor-id cookie for multi-doctor assistants.
 * Validates that the requesting user actually has a DoctorMember for the given doctorId.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { doctorId } = body

    if (!doctorId || typeof doctorId !== 'string') {
      return NextResponse.json({ error: 'doctorId requerido' }, { status: 400 })
    }

    // Validate the user has an active membership for this doctor
    const member = await prisma.doctorMember.findFirst({
      where: { authId: user.id, doctorId, active: true },
      select: { id: true },
    })

    if (!member) {
      return NextResponse.json({ error: 'No tienes acceso a este médico' }, { status: 403 })
    }

    const response = NextResponse.json({ ok: true })

    // Set cookie: HttpOnly, SameSite=Lax, 30 days
    response.cookies.set('sara-active-doctor-id', doctorId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch (err) {
    console.error('POST /api/assistant/switch-doctor:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
