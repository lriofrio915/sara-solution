import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
}

// GET — cargar la conversación activa (la más reciente)
export async function GET() {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const conv = await prisma.saraConversation.findFirst({
    where: { doctorId: doctor.id, context: 'main' },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ messages: conv?.messages ?? [] })
}

// PUT — guardar/actualizar la conversación activa
export async function PUT(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { messages } = await req.json()

  await prisma.saraConversation.upsert({
    where: {
      // Use a stable unique key per doctor for the "main" chat
      id: `main_${doctor.id}`,
    },
    create: {
      id: `main_${doctor.id}`,
      doctorId: doctor.id,
      context: 'main',
      messages,
      title: 'Chat principal',
    },
    update: {
      messages,
    },
  })

  return NextResponse.json({ ok: true })
}

// DELETE — limpiar la conversación activa
export async function DELETE() {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await prisma.saraConversation.deleteMany({
    where: { doctorId: doctor.id, context: 'main' },
  })

  return NextResponse.json({ ok: true })
}
