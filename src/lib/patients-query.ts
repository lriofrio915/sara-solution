import { prisma } from '@/lib/prisma'

/**
 * Listado de pacientes de un médico.
 *
 * Vive aquí porque lo usan dos consumidores: la página `/patients`, que ahora carga la
 * primera tanda en el servidor, y `GET /api/patients`, que sigue sirviendo la búsqueda
 * incremental desde el cliente. Compartir la consulta evita que el filtro o el `select`
 * se separen entre ambos caminos.
 */

export const PATIENTS_PAGE_SIZE = 50

export type PatientListItem = {
  id: string
  name: string
  email: string | null
  phone: string | null
  birthDate: Date | null
  bloodType: string
  documentId: string | null
  allergies: string[]
  createdAt: Date
  _count: { appointments: number }
}

export function buildPatientWhere(doctorId: string, q: string) {
  return {
    doctorId,
    deletedAt: null,  // Excluir pacientes con soft delete (LOPDP B6)
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q } },
            { documentId: { contains: q } },
          ],
        }
      : {}),
  }
}

export async function listPatients({
  doctorId,
  q = '',
  page = 1,
  limit = PATIENTS_PAGE_SIZE,
}: {
  doctorId: string
  q?: string
  page?: number
  limit?: number
}): Promise<{ patients: PatientListItem[]; total: number }> {
  const where = buildPatientWhere(doctorId, q)

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        bloodType: true,
        documentId: true,
        allergies: true,
        createdAt: true,
        _count: { select: { appointments: true } },
      },
    }),
    prisma.patient.count({ where }),
  ])

  return { patients, total }
}
