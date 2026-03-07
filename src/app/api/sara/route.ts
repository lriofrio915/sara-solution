import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDoctorByAuthId } from '@/lib/queries'
import { askSara, type SaraMessage } from '@/lib/sara'
import { prisma } from '@/lib/prisma'

// POST /api/sara
// Body: { messages: SaraMessage[], conversationId?: string }
// Returns: SSE stream with events
export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const doctor = await getDoctorByAuthId(user.id, user.email ?? undefined)
  if (!doctor) {
    return new Response(JSON.stringify({ error: 'Doctor no encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { messages?: SaraMessage[]; conversationId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages, conversationId } = body

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'messages es requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const context = {
    doctorId: doctor.id,
    doctorName: doctor.name,
    doctorSpecialty: doctor.specialty,
  }

  // SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        let finalContent = ''

        await askSara(messages, context, (event) => {
          if (event.type === 'tool_start') {
            send({ type: 'tool_start', name: event.name, message: event.message })
          } else if (event.type === 'tool_done') {
            send({ type: 'tool_done', name: event.name })
          } else if (event.type === 'response') {
            finalContent = event.content ?? ''
          }
        })

        // Send final content character by character for typing effect
        send({ type: 'content_start' })
        // Send in chunks to avoid overwhelming the client
        const chunkSize = 5
        for (let i = 0; i < finalContent.length; i += chunkSize) {
          send({ type: 'chunk', text: finalContent.slice(i, i + chunkSize) })
        }
        send({ type: 'done' })

        // Persist conversation
        try {
          const userMessages = messages.filter((m) => m.role !== 'system')
          const allMessages: Array<{ role: string; content: string; timestamp: string }> = [
            ...userMessages.map((m) => ({ role: m.role, content: m.content, timestamp: new Date().toISOString() })),
            { role: 'assistant', content: finalContent, timestamp: new Date().toISOString() },
          ]

          if (conversationId) {
            const existing = await prisma.saraConversation.findUnique({
              where: { id: conversationId, doctorId: doctor.id },
            })
            if (existing) {
              const prev = (existing.messages as Array<{ role: string; content: string; timestamp: string }>) ?? []
              await prisma.saraConversation.update({
                where: { id: conversationId },
                data: { messages: [...prev, ...allMessages.slice(-2)] as object[] },
              })
            }
          } else {
            await prisma.saraConversation.create({
              data: {
                doctorId: doctor.id,
                messages: allMessages as object[],
                title: messages[0]?.content?.slice(0, 60) ?? 'Conversación',
              },
            })
          }
        } catch (persistError) {
          console.error('Error persisting conversation:', persistError)
          // Non-fatal — conversation still delivered
        }
      } catch (error) {
        console.error('Sara SSE error:', error)
        const message = error instanceof Error ? error.message : 'Error interno'
        send({ type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
