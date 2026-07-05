import { NextResponse } from 'next/server'
import { createHmac, createHash, randomBytes, randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPortalCodeEmail } from '@/lib/email'
import { timingSafeStringEqual } from '@/lib/timingSafeEqual'

export const dynamic = 'force-dynamic'

const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes

// El challenge es stateless: HMAC-firmado, contiene email + hash del código + expiración.
// Así no se necesita tabla de OTPs y el servidor no revela si el email existe.
function getSecret(): string {
  const secret = process.env.PORTAL_OTP_SECRET ?? process.env.CRON_SECRET
  if (!secret) throw new Error('PORTAL_OTP_SECRET/CRON_SECRET no configurado')
  return secret.trim()
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex')
}

function hashCode(email: string, code: string): string {
  return createHash('sha256').update(`${email}:${code}`).digest('hex')
}

function buildChallenge(email: string, codeHash: string): string {
  const payload = Buffer.from(
    JSON.stringify({ e: email, h: codeHash, x: Date.now() + CODE_TTL_MS }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

function parseChallenge(challenge: string): { e: string; h: string; x: number } | null {
  const dot = challenge.lastIndexOf('.')
  if (dot === -1) return null
  const payload = challenge.slice(0, dot)
  const sig = challenge.slice(dot + 1)
  if (!timingSafeStringEqual(sig, sign(payload))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof data.e !== 'string' || typeof data.h !== 'string' || typeof data.x !== 'number') return null
    return data
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    // Paso 2: verificar código y devolver datos
    if (typeof body.code === 'string' && typeof body.challenge === 'string') {
      const data = parseChallenge(body.challenge)
      if (!data || data.e !== email || Date.now() > data.x) {
        return NextResponse.json({ error: 'Código expirado. Solicita uno nuevo.' }, { status: 401 })
      }
      const code = body.code.trim()
      if (!timingSafeStringEqual(hashCode(email, code), data.h)) {
        return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 })
      }

      const patients = await prisma.patient.findMany({
        where: { email: { equals: email, mode: 'insensitive' } },
        include: {
          doctor: {
            select: {
              name: true,
              specialty: true,
              avatarUrl: true,
              whatsapp: true,
              phone: true,
              schedules: true,
              address: true,
            },
          },
          appointments: {
            where: {
              date: { gte: new Date() },
              status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            },
            orderBy: { date: 'asc' },
            take: 10,
            select: {
              id: true,
              date: true,
              type: true,
              status: true,
              reason: true,
              duration: true,
              location: true,
            },
          },
        },
      })

      if (patients.length === 0) {
        return NextResponse.json({ found: false })
      }

      return NextResponse.json({
        found: true,
        data: patients.map((p) => ({
          patientName: p.name,
          doctor: p.doctor,
          appointments: p.appointments,
        })),
      })
    }

    // Paso 1: enviar código al correo (respuesta idéntica exista o no el paciente,
    // para no permitir enumeración de emails)
    const patientExists =
      (await prisma.patient.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      })) !== null

    let challenge: string
    if (patientExists) {
      const code = String(randomInt(100000, 1000000))
      challenge = buildChallenge(email, hashCode(email, code))
      await sendPortalCodeEmail(email, code)
    } else {
      // Challenge señuelo: hash aleatorio que ningún código puede satisfacer
      challenge = buildChallenge(email, randomBytes(32).toString('hex'))
    }

    return NextResponse.json({ sent: true, challenge })
  } catch (err) {
    console.error('POST /api/patient-portal:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
