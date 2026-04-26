/**
 * Integration tests — /api/patients/[id]/atenciones
 *
 * Verifies doctor isolation AND patient cross-tenant access blocking.
 * The patient lookup `findFirst({ where: { id, doctorId } })` is the
 * security barrier — without it, any authenticated doctor could read any
 * patient's atenciones by guessing the patient ID.
 *
 * Mocks Supabase auth, getDoctorFromUser, audit, Prisma. Does NOT touch
 * the route source.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const DOCTOR_A = { id: 'doctor-a-id', email: 'a@test.com', name: 'Dra. A' }
const DOCTOR_B = { id: 'doctor-b-id' }
const PATIENT_OF_A = { id: 'pa-1' }
const PATIENT_OF_B = { id: 'pb-1' }

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

vi.mock('@/lib/doctor-auth', () => ({
  getDoctorFromUser: vi.fn().mockResolvedValue(DOCTOR_A),
}))

vi.mock('@/lib/audit', () => ({
  auditAttention: vi.fn().mockResolvedValue(undefined),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

const prismaMock = {
  patient: { findFirst: vi.fn() },
  attention: {
    count: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  prescription: {
    findFirst: vi.fn(),
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

describe('GET /api/patients/[id]/atenciones — cross-tenant access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.attention.count.mockResolvedValue(0)
    prismaMock.attention.findMany.mockResolvedValue([])
  })

  it('returns 404 when patient belongs to another doctor (Doctor A asks for Patient of B)', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(null)

    const { GET } = await import('@/app/api/patients/[id]/atenciones/route')
    const res = await GET(
      makeRequest('GET', `https://consultorio.site/api/patients/${PATIENT_OF_B.id}/atenciones`),
      { params: { id: PATIENT_OF_B.id } },
    )

    expect(res.status).toBe(404)
    expect(prismaMock.attention.findMany).not.toHaveBeenCalled()
  })

  it('patient lookup query includes JWT doctorId as filter', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(null)

    const { GET } = await import('@/app/api/patients/[id]/atenciones/route')
    await GET(
      makeRequest('GET', `https://consultorio.site/api/patients/${PATIENT_OF_B.id}/atenciones`),
      { params: { id: PATIENT_OF_B.id } },
    )

    const where = prismaMock.patient.findFirst.mock.calls[0][0].where
    expect(where.doctorId).toBe(DOCTOR_A.id)
  })

  it('attention queries scope to JWT doctorId AND requested patientId', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(PATIENT_OF_A)

    const { GET } = await import('@/app/api/patients/[id]/atenciones/route')
    const res = await GET(
      makeRequest('GET', `https://consultorio.site/api/patients/${PATIENT_OF_A.id}/atenciones`),
      { params: { id: PATIENT_OF_A.id } },
    )

    expect(res.status).toBe(200)
    const findCall = prismaMock.attention.findMany.mock.calls[0][0]
    expect(findCall.where.doctorId).toBe(DOCTOR_A.id)
    expect(findCall.where.patientId).toBe(PATIENT_OF_A.id)
  })

  it('returns 401 when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'no session' } }),
      },
    } as never)

    const { GET } = await import('@/app/api/patients/[id]/atenciones/route')
    const res = await GET(
      makeRequest('GET', `https://consultorio.site/api/patients/${PATIENT_OF_A.id}/atenciones`),
      { params: { id: PATIENT_OF_A.id } },
    )

    expect(res.status).toBe(401)
  })
})

describe('POST /api/patients/[id]/atenciones — isolation + audit trail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.patient.findFirst.mockResolvedValue(PATIENT_OF_A)
    prismaMock.attention.create.mockResolvedValue({
      id: 'att-1',
      datetime: new Date('2026-05-01T15:00:00Z'),
      patientId: PATIENT_OF_A.id,
      doctorId: DOCTOR_A.id,
    })
  })

  it('returns 404 when target patient belongs to another doctor', async () => {
    prismaMock.patient.findFirst.mockResolvedValueOnce(null)

    const { POST } = await import('@/app/api/patients/[id]/atenciones/route')
    const res = await POST(
      makeRequest('POST', `https://consultorio.site/api/patients/${PATIENT_OF_B.id}/atenciones`, {
        service: 'consulta', motive: 'control',
      }),
      { params: { id: PATIENT_OF_B.id } },
    )

    expect(res.status).toBe(404)
    expect(prismaMock.attention.create).not.toHaveBeenCalled()
  })

  it('creates attention with JWT doctorId (ignores body.doctorId injection)', async () => {
    const { POST } = await import('@/app/api/patients/[id]/atenciones/route')
    const res = await POST(
      makeRequest('POST', `https://consultorio.site/api/patients/${PATIENT_OF_A.id}/atenciones`, {
        service: 'consulta',
        motive: 'control',
        doctorId: DOCTOR_B.id, // injection attempt
      }),
      { params: { id: PATIENT_OF_A.id } },
    )

    expect(res.status).toBe(201)
    const data = prismaMock.attention.create.mock.calls[0][0].data
    expect(data.doctorId).toBe(DOCTOR_A.id)
    expect(data.patientId).toBe(PATIENT_OF_A.id)
  })

  it('triggers audit trail on create', async () => {
    const { auditAttention } = await import('@/lib/audit')

    const { POST } = await import('@/app/api/patients/[id]/atenciones/route')
    await POST(
      makeRequest('POST', `https://consultorio.site/api/patients/${PATIENT_OF_A.id}/atenciones`, {
        service: 'consulta', motive: 'control',
      }),
      { params: { id: PATIENT_OF_A.id } },
    )

    expect(auditAttention).toHaveBeenCalledWith(
      DOCTOR_A.id,
      PATIENT_OF_A.id,
      'CREATE',
      expect.objectContaining({ ip: '127.0.0.1', attentionId: 'att-1' }),
    )
  })
})
