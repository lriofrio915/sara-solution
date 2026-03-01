import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDoctorByAuthId } from '@/lib/queries'
import { executeTool } from '@/lib/sara-tools'

// POST /api/sara/tools
// Body: { toolName: string, args: Record<string, unknown> }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const doctor = await getDoctorByAuthId(user.id)
  if (!doctor) {
    return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })
  }

  let body: { toolName?: string; args?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { toolName, args = {} } = body
  if (!toolName) {
    return NextResponse.json({ error: 'toolName es requerido' }, { status: 400 })
  }

  const result = await executeTool(toolName, args, doctor.id)
  return NextResponse.json(result)
}
