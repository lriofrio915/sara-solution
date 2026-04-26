/**
 * Integration tests — /api/exam-orders
 *
 * Verifies doctor isolation and required-field validation.
 * Mocks Supabase auth and Prisma. Does NOT touch the route source.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const DOCTOR_A = { id: 'doctor-a-id', name: 'Dra. A', specialty: 'Med Gen', email: 'a@test.com', phone: null, address: null }
const DOCTOR_B = { id: 'doctor-b-id' }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: DOCTOR_A.id, email: DOCTOR_A.email } },
        error: null,
      }),
    },
  }),
}))

const prismaMock = {
  doctor: { findFirst: vi.fn() },
  examOrder: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
}
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, 'https://consultorio.site'), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/exam-orders — isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.doctor.findFirst.mockResolvedValue(DOCTOR_A)
    prismaMock.examOrder.findMany.mockResolvedValue([])
    prismaMock.examOrder.count.mockResolvedValue(0)
  })

  it('filters exam orders by JWT doctorId', async () => {
    const { GET } = await import('@/app/api/exam-orders/route')
    const req = makeRequest('GET', `https://consultorio.site/api/exam-orders?doctorId=${DOCTOR_B.id}`)
    const res = await GET(req)

    expect(res.status).toBe(200)
    const where = prismaMock.examOrder.findMany.mock.calls[0][0].where
    expect(where.doctorId).toBe(DOCTOR_A.id)
  })

  it('returns 401 when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'no session' } }),
      },
    } as never)

    const { GET } = await import('@/app/api/exam-orders/route')
    const res = await GET(makeRequest('GET', 'https://consultorio.site/api/exam-orders'))

    expect(res.status).toBe(401)
  })

  it('respects optional patientId filter', async () => {
    const { GET } = await import('@/app/api/exam-orders/route')
    await GET(makeRequest('GET', 'https://consultorio.site/api/exam-orders?patientId=p-1'))

    const where = prismaMock.examOrder.findMany.mock.calls[0][0].where
    expect(where.patientId).toBe('p-1')
    expect(where.doctorId).toBe(DOCTOR_A.id)
  })
})

describe('POST /api/exam-orders — validation + isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.doctor.findFirst.mockResolvedValue(DOCTOR_A)
    prismaMock.examOrder.create.mockResolvedValue({ id: 'order-1', doctorId: DOCTOR_A.id })
  })

  it('rejects missing patientId', async () => {
    const { POST } = await import('@/app/api/exam-orders/route')
    const res = await POST(makeRequest('POST', 'https://consultorio.site/api/exam-orders', {
      exams: { hemograma: true },
    }))

    expect(res.status).toBe(400)
    expect(prismaMock.examOrder.create).not.toHaveBeenCalled()
  })

  it('creates exam order scoped to JWT doctor', async () => {
    const { POST } = await import('@/app/api/exam-orders/route')
    const res = await POST(makeRequest('POST', 'https://consultorio.site/api/exam-orders', {
      patientId: 'p-1',
      exams: { hemograma: true, glucosa: true },
      otrosExams: 'Vitamina D',
      doctorId: DOCTOR_B.id, // injection attempt
    }))

    expect(res.status).toBe(201)
    const data = prismaMock.examOrder.create.mock.calls[0][0].data
    expect(data.doctorId).toBe(DOCTOR_A.id)
    expect(data.patientId).toBe('p-1')
  })

  it('defaults exams to empty object when omitted', async () => {
    const { POST } = await import('@/app/api/exam-orders/route')
    await POST(makeRequest('POST', 'https://consultorio.site/api/exam-orders', {
      patientId: 'p-1',
    }))

    const data = prismaMock.examOrder.create.mock.calls[0][0].data
    expect(data.exams).toEqual({})
  })
})
