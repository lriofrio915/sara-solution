/**
 * Integration tests — /api/certificates
 *
 * Verifies doctor isolation, required-field validation, and tenant filtering.
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
  medicalCertificate: {
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

describe('GET /api/certificates — isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.doctor.findFirst.mockResolvedValue(DOCTOR_A)
    prismaMock.medicalCertificate.findMany.mockResolvedValue([])
    prismaMock.medicalCertificate.count.mockResolvedValue(0)
  })

  it('filters certificates by JWT doctorId, ignores query param', async () => {
    const { GET } = await import('@/app/api/certificates/route')
    const req = makeRequest('GET', `https://consultorio.site/api/certificates?doctorId=${DOCTOR_B.id}`)
    const res = await GET(req)

    expect(res.status).toBe(200)
    const where = prismaMock.medicalCertificate.findMany.mock.calls[0][0].where
    expect(where.doctorId).toBe(DOCTOR_A.id)
  })

  it('returns 401 when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'no session' } }),
      },
    } as never)

    const { GET } = await import('@/app/api/certificates/route')
    const res = await GET(makeRequest('GET', 'https://consultorio.site/api/certificates'))

    expect(res.status).toBe(401)
    expect(prismaMock.medicalCertificate.findMany).not.toHaveBeenCalled()
  })

  it('returns 404 when authed user has no doctor record', async () => {
    prismaMock.doctor.findFirst.mockResolvedValueOnce(null)

    const { GET } = await import('@/app/api/certificates/route')
    const res = await GET(makeRequest('GET', 'https://consultorio.site/api/certificates'))

    expect(res.status).toBe(404)
  })
})

describe('POST /api/certificates — validation + isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.doctor.findFirst.mockResolvedValue(DOCTOR_A)
    prismaMock.medicalCertificate.create.mockResolvedValue({ id: 'cert-1', doctorId: DOCTOR_A.id })
  })

  it('rejects missing patientId', async () => {
    const { POST } = await import('@/app/api/certificates/route')
    const res = await POST(makeRequest('POST', 'https://consultorio.site/api/certificates', {
      content: 'Lorem ipsum',
    }))

    expect(res.status).toBe(400)
    expect(prismaMock.medicalCertificate.create).not.toHaveBeenCalled()
  })

  it('rejects empty content', async () => {
    const { POST } = await import('@/app/api/certificates/route')
    const res = await POST(makeRequest('POST', 'https://consultorio.site/api/certificates', {
      patientId: 'p-1',
      content: '   ',
    }))

    expect(res.status).toBe(400)
  })

  it('creates certificate scoped to JWT doctor (ignores body.doctorId injection)', async () => {
    const { POST } = await import('@/app/api/certificates/route')
    const res = await POST(makeRequest('POST', 'https://consultorio.site/api/certificates', {
      patientId: 'p-1',
      content: 'Reposo médico 3 días',
      doctorId: DOCTOR_B.id, // injection attempt
    }))

    expect(res.status).toBe(201)
    expect(prismaMock.medicalCertificate.create).toHaveBeenCalled()
    const data = prismaMock.medicalCertificate.create.mock.calls[0][0].data
    expect(data.doctorId).toBe(DOCTOR_A.id)
  })
})
