/**
 * Integration tests — /api/appointments
 *
 * Verifies doctor isolation, conflict detection, and tenant filtering.
 * Mocks Supabase auth, getDoctorFromUser, and Prisma.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const DOCTOR_A = { id: 'doctor-a-id', email: 'doctora@test.com', name: 'Dra. A' }
const DOCTOR_B = { id: 'doctor-b-id', email: 'doctorb@test.com' }

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

const prismaMock = {
  appointment: {
    findMany: vi.fn(),
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

describe('GET /api/appointments — isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.appointment.findMany.mockResolvedValue([])
  })

  it('always filters by doctorId from JWT, never from query', async () => {
    const { GET } = await import('@/app/api/appointments/route')
    const req = makeRequest('GET', `https://consultorio.site/api/appointments?doctorId=${DOCTOR_B.id}`)
    const res = await GET(req)

    expect(res.status).toBe(200)
    const where = prismaMock.appointment.findMany.mock.calls[0][0].where
    expect(where.doctorId).toBe(DOCTOR_A.id)
    expect(where.doctorId).not.toBe(DOCTOR_B.id)
  })

  it('returns 401 when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'no session' } }),
      },
    } as never)

    const { GET } = await import('@/app/api/appointments/route')
    const req = makeRequest('GET', 'https://consultorio.site/api/appointments')
    const res = await GET(req)

    expect(res.status).toBe(401)
    expect(prismaMock.appointment.findMany).not.toHaveBeenCalled()
  })
})

describe('POST /api/appointments — isolation + conflict', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.appointment.findFirst.mockResolvedValue(null)
    prismaMock.appointment.create.mockResolvedValue({ id: 'apt-1', doctorId: DOCTOR_A.id })
  })

  it('ignores body.doctorId and uses JWT-derived doctor', async () => {
    const { POST } = await import('@/app/api/appointments/route')
    const req = makeRequest('POST', 'https://consultorio.site/api/appointments', {
      patientId: 'p-1',
      date: '2026-05-01T15:00:00.000Z',
      doctorId: DOCTOR_B.id, // injection attempt
    })
    await POST(req)

    expect(prismaMock.appointment.create).toHaveBeenCalled()
    const data = prismaMock.appointment.create.mock.calls[0][0].data
    expect(data.doctorId).toBe(DOCTOR_A.id)
    expect(data.doctorId).not.toBe(DOCTOR_B.id)
  })

  it('rejects when patientId is missing', async () => {
    const { POST } = await import('@/app/api/appointments/route')
    const req = makeRequest('POST', 'https://consultorio.site/api/appointments', { date: '2026-05-01T15:00:00.000Z' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(prismaMock.appointment.create).not.toHaveBeenCalled()
  })

  it('returns 409 on schedule conflict', async () => {
    prismaMock.appointment.findFirst.mockResolvedValueOnce({ id: 'existing-apt' })

    const { POST } = await import('@/app/api/appointments/route')
    const req = makeRequest('POST', 'https://consultorio.site/api/appointments', {
      patientId: 'p-1',
      date: '2026-05-01T15:00:00.000Z',
    })
    const res = await POST(req)

    expect(res.status).toBe(409)
    expect(prismaMock.appointment.create).not.toHaveBeenCalled()
  })

  it('conflict check scopes to JWT doctor, not arbitrary doctor', async () => {
    const { POST } = await import('@/app/api/appointments/route')
    const req = makeRequest('POST', 'https://consultorio.site/api/appointments', {
      patientId: 'p-1',
      date: '2026-05-01T15:00:00.000Z',
    })
    await POST(req)

    const conflictCall = prismaMock.appointment.findFirst.mock.calls[0][0]
    expect(conflictCall.where.doctorId).toBe(DOCTOR_A.id)
  })
})
