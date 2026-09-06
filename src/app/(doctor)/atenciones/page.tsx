import { prisma } from '@/lib/prisma'
import { requireDoctorLayout } from '@/lib/doctor-auth'
import AtencionesListClient, { type Attention } from './AtencionesListClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

// Server component: la primera página viaja renderizada en el HTML. La búsqueda, el
// filtro por tipo y la paginación siguen pasando por GET /api/atenciones.
export default async function AtencionesPage() {
  const doctor = await requireDoctorLayout()

  let items: Attention[] = []
  let total = 0
  try {
    const where = { doctorId: doctor.id }
    const [count, rows] = await Promise.all([
      prisma.attention.count({ where }),
      prisma.attention.findMany({
        where,
        orderBy: { datetime: 'desc' },
        take: PAGE_SIZE,
        select: {
          id: true,
          datetime: true,
          service: true,
          attentionType: true,
          motive: true,
          diagnoses: true,
          durationMins: true,
          patient: { select: { id: true, name: true, documentId: true } },
        },
      }),
    ])
    items = rows.map(row => ({
      ...row,
      datetime: row.datetime.toISOString(),
      diagnoses: (row.diagnoses ?? null) as Attention['diagnoses'],
    }))
    total = count
  } catch (err) {
    console.error('AtencionesPage: error cargando atenciones', err)
  }

  return <AtencionesListClient initialItems={items} initialTotal={total} />
}
