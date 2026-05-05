import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHmac } from 'crypto'

const SECRET = process.env.CREDITS_SECRET ?? 'default_secret'
const CAROUSEL_COST = 5
const TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-carrusel-key')
  if (!apiKey || apiKey !== process.env.CREDITS_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: { token: string; description?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parts = body.token?.split('.')
  if (!parts || parts.length !== 3) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const [doctorId, tsStr, sig] = parts
  const ts = Number(tsStr)
  if (isNaN(ts) || Date.now() - ts > TTL_MS) {
    return NextResponse.json({ error: 'Token expirado' }, { status: 401 })
  }

  const expected = createHmac('sha256', SECRET).update(`${doctorId}:${ts}`).digest('hex')
  if (sig !== expected) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const credit = await prisma.doctorCredit.upsert({
    where: { doctorId },
    update: {},
    create: { doctorId, credits: 0 },
  })

  if (credit.credits < CAROUSEL_COST) {
    return NextResponse.json(
      { error: 'Créditos insuficientes', code: 'INSUFFICIENT_CREDITS', balance: credit.credits },
      { status: 402 }
    )
  }

  await prisma.doctorCredit.update({
    where: { doctorId },
    data: { credits: { decrement: CAROUSEL_COST } },
  })
  await prisma.creditTransaction.create({
    data: {
      doctorId,
      type: 'IMAGE',
      credits: -CAROUSEL_COST,
      description: body.description ?? 'Carrusel IG generado con IA',
    },
  })

  return NextResponse.json({ success: true, cost: CAROUSEL_COST, newBalance: credit.credits - CAROUSEL_COST })
}
