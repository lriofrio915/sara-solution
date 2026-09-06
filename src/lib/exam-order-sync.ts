import { prisma } from './prisma'
import { splitExamsByType, hasAnyExam, type ExamsJson } from './exam-split'

/**
 * Mantiene las ExamOrder de una atención alineadas con el JSON `exams` del formulario.
 *
 * Existe porque el PATCH de atención sincronizaba la receta pero no las órdenes: en el
 * flujo real la médica guarda la atención y recién después añade los exámenes, así que
 * la orden no se creaba nunca y la sección "Órdenes" salía vacía.
 *
 * Se emiten hasta dos órdenes por atención (laboratorio e imagen) para que cada una
 * pueda imprimirse y listarse por separado.
 */

type SyncArgs = {
  attentionId: string
  patientId: string
  doctorId: string
  exams: unknown
  date: Date
}

const TYPES = ['LAB', 'IMAGING'] as const
export type ExamOrderTypeValue = (typeof TYPES)[number]

export function isExamOrderType(value: unknown): value is ExamOrderTypeValue {
  return typeof value === 'string' && (TYPES as readonly string[]).includes(value)
}

export async function syncExamOrders({ attentionId, patientId, doctorId, exams, date }: SyncArgs): Promise<void> {
  const split = splitExamsByType(exams)
  const byType: Record<ExamOrderTypeValue, ExamsJson> = { LAB: split.lab, IMAGING: split.imaging }

  for (const type of TYPES) {
    const payload = byType[type]
    const existing = await prisma.examOrder.findFirst({
      where: { attentionId, doctorId, type },
      select: { id: true },
    })

    if (!hasAnyExam(payload)) {
      // El médico deseleccionó todo lo de este tipo: la orden ya no representa nada
      // clínico, así que se elimina en vez de quedar como fila vacía en el listado.
      // El borrado va acotado a esta atención, este médico y este tipo.
      if (existing) await prisma.examOrder.delete({ where: { id: existing.id } })
      continue
    }

    if (existing) {
      await prisma.examOrder.update({ where: { id: existing.id }, data: { exams: payload, date } })
    } else {
      await prisma.examOrder.create({
        data: { patientId, doctorId, attentionId, type, exams: payload, date },
      })
    }
  }
}
