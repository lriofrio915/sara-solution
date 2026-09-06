/**
 * Unit tests — src/lib/exam-order-sync.ts
 *
 * Regresión: al editar una atención ya guardada, los exámenes añadidos no generaban
 * ninguna ExamOrder y la sección "Órdenes" salía vacía.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = {
  examOrder: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

const { syncExamOrders, isExamOrderType } = await import('@/lib/exam-order-sync')

const BASE = {
  attentionId: 'att-1',
  patientId: 'pat-1',
  doctorId: 'doc-1',
  date: new Date('2026-09-01T10:00:00Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.examOrder.findFirst.mockResolvedValue(null)
})

describe('syncExamOrders', () => {
  it('crea dos órdenes separadas cuando la consulta pide laboratorio e imagen', async () => {
    await syncExamOrders({ ...BASE, exams: { hematologia: ['Plaquetas'], ecografia: ['Abdomen superior'] } })

    expect(prismaMock.examOrder.create).toHaveBeenCalledTimes(2)
    const [lab, imaging] = prismaMock.examOrder.create.mock.calls.map(c => c[0].data)
    expect(lab.type).toBe('LAB')
    expect(lab.exams).toEqual({ hematologia: ['Plaquetas'] })
    expect(imaging.type).toBe('IMAGING')
    expect(imaging.exams).toEqual({ ecografia: ['Abdomen superior'] })
  })

  it('crea solo la orden de laboratorio si no hay imágenes pedidas', async () => {
    await syncExamOrders({ ...BASE, exams: { hematologia: ['Plaquetas'] } })
    expect(prismaMock.examOrder.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.examOrder.create.mock.calls[0][0].data.type).toBe('LAB')
  })

  it('actualiza la orden existente en vez de duplicarla al reeditar la atención', async () => {
    prismaMock.examOrder.findFirst.mockImplementation(async ({ where }: { where: { type: string } }) =>
      where.type === 'LAB' ? { id: 'order-lab' } : null)

    await syncExamOrders({ ...BASE, exams: { hematologia: ['Plaquetas', 'VSG'] } })

    expect(prismaMock.examOrder.create).not.toHaveBeenCalled()
    expect(prismaMock.examOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-lab' },
      data: { exams: { hematologia: ['Plaquetas', 'VSG'] }, date: BASE.date },
    })
  })

  it('elimina la orden cuando el médico deselecciona todos los exámenes de ese tipo', async () => {
    prismaMock.examOrder.findFirst.mockImplementation(async ({ where }: { where: { type: string } }) =>
      where.type === 'IMAGING' ? { id: 'order-img' } : null)

    await syncExamOrders({ ...BASE, exams: { hematologia: ['Plaquetas'] } })

    expect(prismaMock.examOrder.delete).toHaveBeenCalledTimes(1)
    expect(prismaMock.examOrder.delete).toHaveBeenCalledWith({ where: { id: 'order-img' } })
  })

  it('acota la búsqueda a la atención, el médico y el tipo', async () => {
    await syncExamOrders({ ...BASE, exams: { hematologia: ['Plaquetas'] } })
    expect(prismaMock.examOrder.findFirst.mock.calls[0][0].where).toEqual({
      attentionId: 'att-1', doctorId: 'doc-1', type: 'LAB',
    })
  })

  it('no crea nada si la consulta no tiene exámenes', async () => {
    await syncExamOrders({ ...BASE, exams: { hematologia: [] } })
    expect(prismaMock.examOrder.create).not.toHaveBeenCalled()
    expect(prismaMock.examOrder.delete).not.toHaveBeenCalled()
  })
})

describe('isExamOrderType', () => {
  it('acepta solo los valores del enum', () => {
    expect(isExamOrderType('LAB')).toBe(true)
    expect(isExamOrderType('IMAGING')).toBe(true)
    expect(isExamOrderType('lab')).toBe(false)
    expect(isExamOrderType(undefined)).toBe(false)
  })
})
