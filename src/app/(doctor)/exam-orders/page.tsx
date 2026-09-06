import { prisma } from '@/lib/prisma'
import { requireDoctorLayout } from '@/lib/doctor-auth'
import ExamOrdersListClient, { type ExamOrder } from './ExamOrdersListClient'

export const dynamic = 'force-dynamic'

// Server component: la lista viaja renderizada en el HTML. GET /api/exam-orders se
// mantiene para el formulario de atención y las vistas por paciente.
export default async function ExamOrdersPage() {
  const doctor = await requireDoctorLayout()

  let items: ExamOrder[] = []
  let total = 0
  try {
    const where = { doctorId: doctor.id }
    const [rows, count] = await Promise.all([
      prisma.examOrder.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 50,
        select: {
          id: true,
          date: true,
          type: true,
          exams: true,
          attentionId: true,
          patient: { select: { id: true, name: true, documentId: true } },
        },
      }),
      prisma.examOrder.count({ where }),
    ])
    items = rows.map(row => ({
      ...row,
      date: row.date.toISOString(),
      exams: (row.exams ?? {}) as ExamOrder['exams'],
    }))
    total = count
  } catch (err) {
    console.error('ExamOrdersPage: error cargando órdenes', err)
  }

  return <ExamOrdersListClient initialItems={items} initialTotal={total} />
}
