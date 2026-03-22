import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ isAdmin: false })

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { email: true, plan: true },
  })

  if (!doctor) return NextResponse.json({ isAdmin: false })

  // Admin: email en ADMIN_EMAILS (comma-separated) o plan ENTERPRISE
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const isAdmin = adminEmails.includes(doctor.email.toLowerCase()) || doctor.plan === 'ENTERPRISE'

  return NextResponse.json({ isAdmin, email: doctor.email })
}
