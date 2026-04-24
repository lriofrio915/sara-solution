import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { parseBody } from '@/lib/validation/parseBody'
import { LeadUpdateSchema } from '@/lib/validation/schemas/lead'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = await parseBody(request, LeadUpdateSchema)
  if (!parsed.ok) return parsed.response

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: parsed.data,
  })

  return NextResponse.json(lead)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lead = await prisma.lead.delete({
    where: { id: params.id },
  })

  return NextResponse.json(lead)
}
