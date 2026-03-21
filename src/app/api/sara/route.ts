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

  let body: { messages?: SaraMessage[]; conversationId?: string; patientId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages, conversationId, patientId } = body

  // Fetch patient context if patientId provided (popup mode)
  let patientContext: string | undefined
  if (patientId) {
    try {
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, doctorId: doctor.id },
        include: {
          attentions: {
            orderBy: { datetime: 'desc' },
            take: 3,
            select: { datetime: true, motive: true, diagnoses: true, prescriptionData: true, evolution: true },
          },
          prescriptions: {
            orderBy: { date: 'desc' },
            take: 3,
            select: { date: true, medications: true, diagnosis: true, instructions: true },
          },
        },
      })
      if (patient) {
        const lines: string[] = [
          `Nombre: ${patient.name}`,
          patient.documentId ? `Cédula: ${patient.documentId}` : '',
          patient.birthDate
            ? `Edad: ${Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años`
            : '',
          patient.bloodType && patient.bloodType !== 'UNKNOWN' ? `Tipo de sangre: ${patient.bloodType}` : '',
          patient.allergies?.length ? `Alergias: ${patient.allergies.join(', ')}` : '',
          patient.phone ? `Teléfono: ${patient.phone}` : '',
        ].filter(Boolean)

        if (patient.attentions?.length) {
          lines.push('\nÚltimas atenciones:')
          patient.attentions.forEach(a => {
            const date = new Date(a.datetime).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' })
            const diagnoses = (a.diagnoses as { cie10Desc?: string }[] | null)
            const dx = diagnoses?.map(d => d.cie10Desc).filter(Boolean).join(', ')
            lines.push(`  · ${date}${a.motive ? ': ' + a.motive : ''}${dx ? ' — Dx: ' + dx : ''}`)
          })
        }

        if (patient.prescriptions?.length) {
          lines.push('\nÚltimas recetas:')
          patient.prescriptions.forEach(p => {
            const date = new Date(p.date).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' })
            const meds = (p.medications as { name: string }[])?.map(m => m.name).join(', ')
            lines.push(`  · ${date}${p.diagnosis ? ' (' + p.diagnosis + ')' : ''}: ${meds}`)
          })
        }

        patientContext = lines.join('\n')
      }
    } catch (e) {
      console.error('Error fetching patient context:', e)
    }
  }

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
    patientContext,
    saraPersonality: (doctor as { saraPersonality?: string | null }).saraPersonality ?? undefined,
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
