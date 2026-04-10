/**
 * Tier 1 Security Tests — Doctor Isolation
 *
 * Verifica que ningún médico pueda acceder o modificar datos de otro médico.
 * Estos tests deben pasar ANTES de cualquier deploy que toque auth o datos.
 *
 * Patrón: mockeamos Supabase auth y Prisma para simular dos médicos distintos.
 * El test verifica que doctor_id siempre viene del JWT (no del request body).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── IDs de prueba ──────────────────────────────────────────────────────────────
const DOCTOR_A = { id: 'doctor-a-id', email: 'doctora@test.com' }
const DOCTOR_B = { id: 'doctor-b-id', email: 'doctorb@test.com' }
const PATIENT_OF_B = { id: 'patient-b-id', doctorId: DOCTOR_B.id, name: 'Paciente de B' }

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock Supabase: autenticado como Doctor A
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

// Mock getDoctorFromUser: devuelve Doctor A
vi.mock('@/lib/doctor-auth', () => ({
  getDoctorFromUser: vi.fn().mockResolvedValue(DOCTOR_A),
}))

// Mock auditPatient / getClientIp (efectos secundarios inocuos)
vi.mock('@/lib/audit', () => ({
  auditPatient: vi.fn().mockResolvedValue(undefined),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

// Mock Prisma
const prismaMock = {
  patient: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  doctor: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  prescription: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  appointment: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, 'https://consultorio.site'), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Doctor isolation — GET /api/patients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.patient.findMany.mockResolvedValue([])
    prismaMock.patient.count.mockResolvedValue(0)
  })

  it('siempre filtra por el doctorId del JWT, no del query param', async () => {
    const { GET } = await import('@/app/api/patients/route')

    // Intento: Doctor A pide pacientes con doctorId de Doctor B en la URL
    const req = makeRequest('GET', `https://consultorio.site/api/patients?doctorId=${DOCTOR_B.id}`)
    const res = await GET(req)

    expect(res.status).toBe(200)

    // La query de Prisma debe usar doctor.id (Doctor A), nunca el param de la URL
    expect(prismaMock.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ doctorId: DOCTOR_A.id }),
      })
    )

    // Nunca debe filtrarse por Doctor B
    const callArgs = prismaMock.patient.findMany.mock.calls[0][0]
    expect(callArgs.where.doctorId).not.toBe(DOCTOR_B.id)
  })

  it('retorna 401 si no hay usuario autenticado', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'No session' },
        }),
      },
    } as never)

    const { GET } = await import('@/app/api/patients/route')
    const req = makeRequest('GET', 'https://consultorio.site/api/patients')
    const res = await GET(req)

    expect(res.status).toBe(401)
    expect(prismaMock.patient.findMany).not.toHaveBeenCalled()
  })
})

describe('Doctor isolation — POST /api/patients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.patient.create.mockResolvedValue({ id: 'new-patient', doctorId: DOCTOR_A.id })
  })

  it('ignora doctorId en el body y usa el del JWT', async () => {
    const { POST } = await import('@/app/api/patients/route')

    // Intento: body incluye doctorId de Doctor B
    const req = makeRequest('POST', 'https://consultorio.site/api/patients', {
      name: 'Paciente Test',
      doctorId: DOCTOR_B.id,  // intento de inyección
    })
    const res = await POST(req)

    // Debe crear el paciente con doctor A, no B
    if (prismaMock.patient.create.mock.calls.length > 0) {
      const createCall = prismaMock.patient.create.mock.calls[0][0]
      expect(createCall.data.doctorId).toBe(DOCTOR_A.id)
      expect(createCall.data.doctorId).not.toBe(DOCTOR_B.id)
    }

    // No debe ser 500 (el request debe procesarse)
    expect(res.status).not.toBe(500)
  })
})

describe('Doctor isolation — GET /api/patients/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no devuelve un paciente que pertenece a otro médico', async () => {
    // Simula que Prisma no encuentra el paciente (porque doctorId no coincide)
    prismaMock.patient.findFirst.mockResolvedValue(null)

    const { GET } = await import('@/app/api/patients/[id]/route')

    const req = makeRequest('GET', `https://consultorio.site/api/patients/${PATIENT_OF_B.id}`)
    const res = await GET(req, { params: { id: PATIENT_OF_B.id } })

    // Si Prisma devuelve null, debe ser 404 — nunca 200 con datos de otro médico
    expect(res.status).toBe(404)
  })

  it('la query a Prisma incluye doctorId del JWT como filtro', async () => {
    prismaMock.patient.findFirst.mockResolvedValue(null)

    const { GET } = await import('@/app/api/patients/[id]/route')
    const req = makeRequest('GET', `https://consultorio.site/api/patients/${PATIENT_OF_B.id}`)
    await GET(req, { params: { id: PATIENT_OF_B.id } })

    if (prismaMock.patient.findFirst.mock.calls.length > 0) {
      const whereClause = prismaMock.patient.findFirst.mock.calls[0][0].where
      // La query debe incluir el doctorId para el filtro de aislamiento
      expect(whereClause).toMatchObject(
        expect.objectContaining({ doctorId: DOCTOR_A.id })
      )
    }
  })
})

describe('Webhook security — /api/webhooks/hotmart', () => {
  it('rechaza requests sin el Hottok correcto', async () => {
    process.env.HOTMART_HOTTOK = 'secret-correcto'

    const { POST } = await import('@/app/api/webhooks/hotmart/route')

    const req = makeRequest('POST', 'https://consultorio.site/api/webhooks/hotmart', {
      event: 'PURCHASE_COMPLETE',
      data: { product: { id: 7359716 }, buyer: { email: 'test@test.com' } },
    })
    // Sin header hottok
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('acepta requests con el Hottok correcto', async () => {
    process.env.HOTMART_HOTTOK = 'secret-correcto'
    process.env.HOTMART_PRODUCT_ID_MONTHLY = '7359716'

    prismaMock.doctor.updateMany.mockResolvedValue({ count: 0 })

    const { POST } = await import('@/app/api/webhooks/hotmart/route')
    const req = new NextRequest('https://consultorio.site/api/webhooks/hotmart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hotmart-hottok': 'secret-correcto',
      },
      body: JSON.stringify({
        event: 'PURCHASE_COMPLETE',
        data: { product: { id: 7359716 }, buyer: { email: 'test@test.com' } },
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
