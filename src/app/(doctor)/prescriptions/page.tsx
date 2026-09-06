import { prisma } from '@/lib/prisma'
import { requireDoctorLayout } from '@/lib/doctor-auth'
import PrescriptionsListClient, { type Prescription } from './PrescriptionsListClient'

export const dynamic = 'force-dynamic'

// Server component: la lista viaja renderizada en el HTML en vez de pedirse desde un
// useEffect después de hidratar. GET /api/prescriptions se mantiene: lo usan el
// formulario de atención y otros consumidores.
export default async function PrescriptionsPage() {
  const doctor = await requireDoctorLayout()

  let items: Prescription[] = []
  let total = 0
  try {
    const where = { doctorId: doctor.id }
    const [rows, count] = await Promise.all([
      prisma.prescription.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 50,
        select: {
          id: true,
          date: true,
          diagnosis: true,
          attentionId: true,
          medications: true,
          patient: { select: { id: true, name: true, documentId: true } },
        },
      }),
      prisma.prescription.count({ where }),
    ])
    items = rows.map(row => ({
      ...row,
      // El cliente espera fechas serializadas, igual que cuando venían del API.
      date: row.date.toISOString(),
      medications: (row.medications ?? []) as Prescription['medications'],
    }))
    total = count
  } catch (err) {
    // Un fallo de base de datos deja la sección vacía, no rota.
    console.error('PrescriptionsPage: error cargando recetas', err)
  }

  return <PrescriptionsListClient initialItems={items} initialTotal={total} />
}
