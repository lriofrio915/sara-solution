/**
 * GET  /api/team/members  — list team members for the authenticated doctor
 * POST /api/team/members  — invite a new assistant (creates Supabase user + DoctorMember)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    if (doctor.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const members = await prisma.doctorMember.findMany({
      where: { doctorId: doctor.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, role: true, active: true, canSign: true, avatarUrl: true, createdAt: true },
    })

    return NextResponse.json({ members })
  } catch (err) {
    console.error('GET /api/team/members:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    if (doctor.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { name, email } = body

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400 })
    }

    // Check if already a member
    const existing = await prisma.doctorMember.findFirst({
      where: { doctorId: doctor.id, email: email.trim().toLowerCase() },
    })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un miembro con ese email' }, { status: 409 })
    }

    const admin = createAdminClient()
    const cleanEmail = email.trim().toLowerCase()

    // Check if this email already has a Supabase account (assistant in another practice)
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => u.email === cleanEmail)

    let authUserId: string

    if (existingAuthUser) {
      // User already has a Supabase account — just link them to this doctor
      authUserId = existingAuthUser.id
    } else {
      // New user — send invite email
      const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
        cleanEmail,
        {
          data: { role: 'assistant', doctorName: doctor.name },
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login`,
        }
      )

      if (inviteError || !inviteData.user) {
        console.error('Supabase invite error:', inviteError)
        return NextResponse.json({ error: inviteError?.message ?? 'Error al invitar usuario' }, { status: 500 })
      }

      authUserId = inviteData.user.id
    }

    // Store DoctorMember (@@unique([doctorId, authId]) prevents duplicates)
    const member = await prisma.doctorMember.create({
      data: {
        doctorId: doctor.id,
        authId: authUserId,
        email: cleanEmail,
        name: name.trim(),
        role: 'ASSISTANT',
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (err) {
    console.error('POST /api/team/members:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
