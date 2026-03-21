import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'
import { TRIAL_DAYS } from '@/lib/plan'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, firstName, lastName, specialty, email, phone, whatsapp } = body

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId y email son requeridos' },
        { status: 400 }
      )
    }

    const name = `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0]
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    const doctor = await prisma.doctor.upsert({
      where: { email },
      update: {},
      create: {
        id: userId,
        name,
        email,
        phone: phone || null,
        whatsapp: whatsapp || null,
        specialty: specialty || 'General',
        slug: `${slug}-${userId.slice(0, 6)}`,
        plan: 'TRIAL',
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
        active: true,
      },
    })

    // Send welcome email (non-blocking — don't fail registration if email fails)
    sendWelcomeEmail(doctor.email, doctor.name).catch((err) =>
      console.error('Welcome email error:', err),
    )

    return NextResponse.json({ doctor }, { status: 201 })
  } catch (error) {
    console.error('Error en register:', error)
    return NextResponse.json(
      { error: 'Error interno', details: String(error) },
      { status: 500 }
    )
  }
}
