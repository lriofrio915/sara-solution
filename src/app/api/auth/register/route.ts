import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'
import { TRIAL_DAYS } from '@/lib/plan'

/** Genera un código de referido legible: primeras 5 letras del nombre + 5 últimos chars del ID. */
function generateReferralCode(name: string, id: string): string {
  const namePart = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)[0]
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 5)
  const idPart = id.replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase()
  return `${namePart}${idPart}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, firstName, lastName, specialty, email, phone, whatsapp, referralCode } = body

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

    // Generar código de referido propio (intentar con el patrón, hacer fallback con más chars del ID)
    let myReferralCode = generateReferralCode(name, userId)
    const existing = await prisma.doctor.findUnique({ where: { referralCode: myReferralCode } })
    if (existing) {
      // Fallback: agregar timestamp para garantizar unicidad
      myReferralCode = `${myReferralCode}${Date.now().toString(36).slice(-3).toUpperCase()}`
    }

    // Buscar doctor referidor si se proporcionó un código de referido
    let referrerId: string | null = null
    if (referralCode) {
      const referrer = await prisma.doctor.findUnique({
        where: { referralCode: referralCode.trim().toUpperCase() },
        select: { id: true },
      })
      if (referrer) referrerId = referrer.id
    }

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
        referralCode: myReferralCode,
        referredById: referrerId,
      },
    })

    // Crear registro de referido si aplica
    if (referrerId) {
      await prisma.referral.create({
        data: {
          referrerId,
          referredId: doctor.id,
          status: 'PENDING',
        },
      }).catch(() => {
        // Si ya existe (upsert de doctor preexistente), ignorar
      })
    }

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
