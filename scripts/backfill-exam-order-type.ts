/**
 * Backfill de ExamOrder.type.
 *
 * Las órdenes creadas antes de la columna `type` guardaban laboratorio e imagen en un
 * mismo registro. Este script las reclasifica:
 *   - solo laboratorio            → type = LAB
 *   - solo imagen                 → type = IMAGING
 *   - mixtas                      → la fila original se queda con lo de laboratorio y
 *                                   se CREA una fila nueva con lo de imagen
 *
 * No borra ninguna fila. Es idempotente: una segunda pasada no encuentra nada que hacer.
 *
 * Uso:
 *   npx tsx scripts/backfill-exam-order-type.ts            # dry-run (por defecto)
 *   npx tsx scripts/backfill-exam-order-type.ts --apply    # aplica los cambios
 *
 * Ejecutar SIEMPRE después de `npm run db:backup`.
 */
import { PrismaClient } from '@prisma/client'
import { splitExamsByType, hasAnyExam } from '../src/lib/exam-split'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

async function main() {
  const orders = await prisma.examOrder.findMany({
    select: { id: true, type: true, exams: true, patientId: true, doctorId: true, attentionId: true, date: true },
    orderBy: { date: 'asc' },
  })

  let toLab = 0, toImaging = 0, toSplit = 0, untouched = 0

  for (const order of orders) {
    const { lab, imaging } = splitExamsByType(order.exams)
    const hasLab = hasAnyExam(lab)
    const hasImaging = hasAnyExam(imaging)

    if (hasLab && hasImaging) {
      toSplit++
      console.log(`[SPLIT]   ${order.id} → LAB (${Object.keys(lab).length} claves) + nueva IMAGING (${Object.keys(imaging).length} claves)`)
      if (APPLY) {
        await prisma.examOrder.update({ where: { id: order.id }, data: { type: 'LAB', exams: lab } })
        await prisma.examOrder.create({
          data: {
            patientId: order.patientId,
            doctorId: order.doctorId,
            attentionId: order.attentionId,
            type: 'IMAGING',
            exams: imaging,
            date: order.date,
          },
        })
      }
    } else if (hasImaging) {
      if (order.type === 'IMAGING') { untouched++; continue }
      toImaging++
      console.log(`[IMAGING] ${order.id}`)
      if (APPLY) await prisma.examOrder.update({ where: { id: order.id }, data: { type: 'IMAGING', exams: imaging } })
    } else {
      if (order.type === 'LAB') { untouched++; continue }
      toLab++
      console.log(`[LAB]     ${order.id}`)
      if (APPLY) await prisma.examOrder.update({ where: { id: order.id }, data: { type: 'LAB', exams: lab } })
    }
  }

  console.log('\n─────────────────────────────')
  console.log(`Total revisadas : ${orders.length}`)
  console.log(`Sin cambios     : ${untouched}`)
  console.log(`→ LAB           : ${toLab}`)
  console.log(`→ IMAGING       : ${toImaging}`)
  console.log(`→ Divididas     : ${toSplit} (crean ${toSplit} filas nuevas)`)
  console.log(APPLY ? '\nCambios APLICADOS.' : '\nDry-run: no se escribió nada. Reejecuta con --apply.')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
