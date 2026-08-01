/**
 * GET /api/atenciones — todas las atenciones del médico, de todos sus pacientes.
 *
 * Complementa /api/patients/[id]/atenciones (historial de UN paciente) para la
 * vista global del consultorio. Filtros: ?q= (nombre o cédula del paciente),
 * ?desde= / ?hasta= (fecha), ?tipo= (servicio). Paginado con ?page= y ?limit=.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const tipo = searchParams.get('tipo')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))

    const where: Prisma.AttentionWhereInput = { doctorId: doctor.id }
    if (desde || hasta) {
      where.datetime = {
        ...(desde && { gte: new Date(desde) }),
        ...(hasta && { lte: new Date(hasta + 'T23:59:59') }),
      }
    }
    if (tipo) where.service = tipo
    if (q) {
      where.patient = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { documentId: { contains: q, mode: 'insensitive' } },
        ],
      }
    }

    const [total, atenciones] = await Promise.all([
      prisma.attention.count({ where }),
      prisma.attention.findMany({
        where,
        orderBy: { datetime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          datetime: true,
          service: true,
          attentionType: true,
          motive: true,
          diagnoses: true,
          durationMins: true,
          establishment: true,
          patient: { select: { id: true, name: true, documentId: true } },
        },
      }),
    ])

    return NextResponse.json({ atenciones, total, page, limit })
  } catch (err) {
    console.error('GET /api/atenciones:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
