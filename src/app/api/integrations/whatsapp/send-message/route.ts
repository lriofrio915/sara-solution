/**
 * POST /api/integrations/whatsapp/send-message
 * Allows the doctor to send a WhatsApp message to a patient when humanMode is active.
 * Body: { conversationId: string, text: string }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendWA } from '@/lib/whatsapp'
import type { SaraMessage } from '@/lib/sara'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true, evolutionInstance: true },
    })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    if (!doctor.evolutionInstance) {
      return NextResponse.json({ error: 'No tienes una instancia de WhatsApp configurada' }, { status: 400 })
    }

    const body = await req.json() as { conversationId?: string; text?: string }
    if (!body.conversationId || !body.text?.trim()) {
      return NextResponse.json({ error: 'conversationId y text son requeridos' }, { status: 400 })
    }

    const conv = await prisma.saraConversation.findFirst({
      where: { id: body.conversationId, doctorId: doctor.id, context: 'whatsapp' },
    })
    if (!conv) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    if (!conv.humanMode) {
      return NextResponse.json({ error: 'Esta conversación no está en modo humano' }, { status: 400 })
    }

    // Extract patient phone from title (format: "wa_{phone}")
    const phone = conv.title?.replace('wa_', '') ?? ''
    if (!phone) return NextResponse.json({ error: 'No se pudo determinar el número del paciente' }, { status: 400 })

    // Send via Evolution
    const sent = await sendWA(phone, body.text.trim(), doctor.evolutionInstance)
    if (!sent) {
      return NextResponse.json({ error: 'No se pudo enviar el mensaje por WhatsApp' }, { status: 502 })
    }

    // Save to conversation history
    const history = (conv.messages as unknown as SaraMessage[])
    history.push({ role: 'assistant', content: `[Doctor]: ${body.text.trim()}` })

    await prisma.saraConversation.update({
      where: { id: conv.id },
      data: { messages: history as unknown as never },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/integrations/whatsapp/send-message:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
