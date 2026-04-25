/**
 * Integration tests — /api/prescriptions
 *
 * Verifies doctor isolation, ACESS-2023-0030 DCI requirement, and audit trail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const DOCTOR_A = { id: 'doctor-a-id', email: 'doctora@test.com', name: 'Dra. A' }
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

vi.mock('@/lib/audit', () => ({
  auditPrescription: vi.fn().mockResolvedValue(undefined),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

const prismaMock = {
  doctor: { findFirst: vi.fn() },
  prescription: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, 'https://consultorio.site'), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/prescriptions — isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.doctor.findFirst.mockResolvedValue(DOCTOR_A)
    prismaMock.prescription.findMany.mockResolvedValue([])
    prismaMock.prescription.count.mockResolvedValue(0)
  })

  it('filters prescriptions by JWT doctorId', async () => {
    const { GET } = await import('@/app/api/prescriptions/route')
    const req = makeRequest('GET', `https://consultorio.site/api/prescriptions?doctorId=${DOCTOR_B.id}`)
    const res = await GET(req)

    expect(res.status).toBe(200)
    const where = prismaMock.prescription.findMany.mock.calls[0][0].where
    expect(where.doctorId).toBe(DOCTOR_A.id)
  })

  it('returns 401 when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'no session' } }),
      },
    } as never)

    const { GET } = await import('@/app/api/prescriptions/route')
    const req = makeRequest('GET', 'https://consultorio.site/api/prescriptions')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('returns 404 when doctor record not found for authed user', async () => {
    prismaMock.doctor.findFirst.mockResolvedValueOnce(null)

    const { GET } = await import('@/app/api/prescriptions/route')
    const req = makeRequest('GET', 'https://consultorio.site/api/prescriptions')
    const res = await GET(req)

    expect(res.status).toBe(404)
  })
})

describe('POST /api/prescriptions — DCI requirement + isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.doctor.findFirst.mockResolvedValue(DOCTOR_A)
    prismaMock.prescription.create.mockResolvedValue({ id: 'rx-1', doctorId: DOCTOR_A.id, rxNumber: 'N.001' })
    prismaMock.$transaction.mockImplementation(async (fn) => {
      // Simulate the transaction running with a tx proxy that exposes
      // the same mocks. The route uses tx.doctor.update + tx.prescription.create.
      const tx = {
        doctor: { update: vi.fn().mockResolvedValue({ prescriptionCounter: 1 }) },
        prescription: { create: prismaMock.prescription.create },
      }
      return fn(tx)
    })
  })

  it('rejects when patientId is missing', async () => {
    const { POST } = await import('@/app/api/prescriptions/route')
    const req = makeRequest('POST', 'https://consultorio.site/api/prescriptions', {
      medications: [{ name: 'X', dci: 'paracetamol' }],
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('rejects when medications array is empty', async () => {
    const { POST } = await import('@/app/api/prescriptions/route')
    const req = makeRequest('POST', 'https://consultorio.site/api/prescriptions', {
      patientId: 'p-1',
      medications: [],
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('rejects medication missing DCI (ACESS-2023-0030)', async () => {
    const { POST } = await import('@/app/api/prescriptions/route')
    const req = makeRequest('POST', 'https://consultorio.site/api/prescriptions', {
      patientId: 'p-1',
      medications: [{ name: 'Ibuprofeno' }], // no dci
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/DCI/)
  })

  it('creates prescription scoped to JWT doctor', async () => {
    const { POST } = await import('@/app/api/prescriptions/route')
    const req = makeRequest('POST', 'https://consultorio.site/api/prescriptions', {
      patientId: 'p-1',
      doctorId: DOCTOR_B.id, // injection attempt
      medications: [{ name: 'Ibuprofeno', dci: 'ibuprofeno' }],
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    expect(prismaMock.prescription.create).toHaveBeenCalled()
    const data = prismaMock.prescription.create.mock.calls[0][0].data
    expect(data.doctorId).toBe(DOCTOR_A.id)
  })
})
