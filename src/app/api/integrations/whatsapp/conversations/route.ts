/**
 * GET  /api/integrations/whatsapp/conversations
 *   Returns all WhatsApp conversations for the authenticated doctor
 *   (context: 'whatsapp'), ordered by most recent activity.
 *
 * PATCH /api/integrations/whatsapp/conversations
 *   Body: { id: string; humanMode: boolean }
 *   Toggles humanMode on a specific conversation.
 *
 * DELETE /api/integrations/whatsapp/conversations
 *   Body: { id: string }
 *   Permanently deletes a conversation.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getAuthDoctor(userId: string, userEmail: string) {
  return prisma.doctor.findFirst({
    where: { OR: [{ id: userId }, { email: userEmail }] },
    select: { id: true },
  })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getAuthDoctor(user.id, user.email!)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const conversations = await prisma.saraConversation.findMany({
      where: { doctorId: doctor.id, context: 'whatsapp' },
      select: {
        id: true,
        title: true,
        messages: true,
        humanMode: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    // Shape: extract last message preview + patient phone from title
    const result = conversations.map((conv) => {
      const msgs = conv.messages as { role: string; content: string }[]
      // Skip system injection messages
      const visible = msgs.filter(
        m => !m.content.startsWith('[Sistema:') && m.content !== '[Modo humano activado]'
      )
      const last = visible[visible.length - 1] ?? null
      const phone = conv.title?.replace('wa_', '') ?? ''

      return {
        id: conv.id,
        phone,
        humanMode: conv.humanMode,
        messageCount: visible.length,
        messages: visible,
        lastMessage: last
          ? { role: last.role, content: last.content.slice(0, 120) }
          : null,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/integrations/whatsapp/conversations:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getAuthDoctor(user.id, user.email!)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const body = await req.json() as { id?: string; humanMode?: boolean }
    if (!body.id || body.humanMode === undefined) {
      return NextResponse.json({ error: 'id and humanMode required' }, { status: 400 })
    }

    // Verify ownership
    const conv = await prisma.saraConversation.findFirst({
      where: { id: body.id, doctorId: doctor.id, context: 'whatsapp' },
    })
    if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.saraConversation.update({
      where: { id: body.id },
      data: { humanMode: body.humanMode },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/integrations/whatsapp/conversations:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getAuthDoctor(user.id, user.email!)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const body = await req.json() as { id?: string }
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Verify ownership before deleting
    const conv = await prisma.saraConversation.findFirst({
      where: { id: body.id, doctorId: doctor.id, context: 'whatsapp' },
    })
    if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.saraConversation.delete({ where: { id: body.id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/integrations/whatsapp/conversations:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
