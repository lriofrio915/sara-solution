/**
 * GET /api/public/[slug]/profile
 * Returns minimal public doctor info for the booking page header.
 * No auth required.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: { slug: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const doctor = await prisma.doctor.findUnique({
    where: { slug: params.slug },
    select: { name: true, specialty: true, avatarUrl: true, slug: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(doctor)
}
