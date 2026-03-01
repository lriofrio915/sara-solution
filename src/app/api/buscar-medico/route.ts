import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() ?? ''

    if (!q || q.length < 2) {
      return NextResponse.json({ doctors: [] })
    }

    const doctors = await prisma.doctor.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { specialty: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        specialty: true,
        bio: true,
        avatarUrl: true,
        address: true,
        schedules: true,
        whatsapp: true,
        slug: true,
      },
      take: 20,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ doctors })
  } catch (err) {
    console.error('GET /api/buscar-medico:', err)
    return NextResponse.json({ doctors: [] }, { status: 500 })
  }
}
