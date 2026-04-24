import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { parseBody } from '@/lib/validation/parseBody'
import { LeadCreateSchema } from '@/lib/validation/schemas/lead'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const source = searchParams.get('source')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (source) where.source = source
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(leads)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = await parseBody(request, LeadCreateSchema)
  if (!parsed.ok) return parsed.response
  const { name, email, phone, source, campaign, status, notes } = parsed.data

  const lead = await prisma.lead.create({
    data: {
      name,
      email: email ?? null,
      phone: phone ?? null,
      source: source ?? 'OTRO',
      campaign: campaign ?? null,
      status: status ?? 'NUEVO',
      notes: notes ?? null,
    },
  })

  return NextResponse.json(lead, { status: 201 })
}
