import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createHmac } from 'crypto'

const SECRET = process.env.CREDITS_SECRET ?? 'default_secret'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })

  const ts = Date.now()
  const payload = `${doctor.id}:${ts}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  const token = `${doctor.id}.${ts}.${sig}`

  return NextResponse.json({ token })
}
