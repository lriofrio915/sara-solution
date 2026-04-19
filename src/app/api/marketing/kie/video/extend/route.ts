import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createVideoExtendTask } from '@/lib/kie-ai'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { prevTaskId } = await req.json()
  if (!prevTaskId?.trim()) return NextResponse.json({ error: 'prevTaskId requerido' }, { status: 400 })

  try {
    const result = await createVideoExtendTask(prevTaskId)
    return NextResponse.json({ taskId: result.taskId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('KIE video extend error:', message)
    return NextResponse.json({ error: `Error al extender video: ${message}` }, { status: 500 })
  }
}
