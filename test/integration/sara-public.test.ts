/**
 * Integration tests — /api/sara/public
 *
 * Tests early-exit paths (Zod validation, doctor lookup, inactive flag) without
 * invoking the OpenAI/OpenRouter network call.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const DOCTOR_ACTIVE = {
  id: 'd1',
  name: 'Dra. López',
  specialty: 'Cardiología',
  bio: null,
  address: null,
  phone: null,
  whatsapp: null,
  schedules: null,
  services: null,
  branches: null,
  active: true,
}

const prismaMock = {
  doctor: { findUnique: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

// Stub sara-tools so it doesn't try to load real tool implementations
vi.mock('@/lib/sara-tools', () => ({
  executeTool: vi.fn().mockResolvedValue({ ok: true }),
}))

// Stub openai to prevent any chance of a real API call. The tests below
// short-circuit BEFORE OpenAI is invoked, but defense-in-depth.
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: vi.fn().mockRejectedValue(new Error('OpenAI should not be called in this test')) } }
  },
}))

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('https://consultorio.site/api/sara/public', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/sara/public — input validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 422 when slug is missing', async () => {
    const { POST } = await import('@/app/api/sara/public/route')
    const res = await POST(makeRequest({ messages: [{ role: 'user', content: 'hola' }] }))
    expect(res.status).toBe(422)
    expect(prismaMock.doctor.findUnique).not.toHaveBeenCalled()
  })

  it('returns 422 when messages is missing', async () => {
    const { POST } = await import('@/app/api/sara/public/route')
    const res = await POST(makeRequest({ slug: 'dr-lopez' }))
    expect(res.status).toBe(422)
  })

  it('returns 422 when messages is empty', async () => {
    const { POST } = await import('@/app/api/sara/public/route')
    const res = await POST(makeRequest({ slug: 'dr-lopez', messages: [] }))
    expect(res.status).toBe(422)
  })

  it('returns 422 when message has invalid role', async () => {
    const { POST } = await import('@/app/api/sara/public/route')
    const res = await POST(makeRequest({
      slug: 'dr-lopez',
      messages: [{ role: 'admin', content: 'hi' }], // not a valid role
    }))
    expect(res.status).toBe(422)
  })
})

describe('POST /api/sara/public — doctor lookup', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 404 when doctor slug is not found', async () => {
    prismaMock.doctor.findUnique.mockResolvedValueOnce(null)
    const { POST } = await import('@/app/api/sara/public/route')
    const res = await POST(makeRequest({
      slug: 'nonexistent',
      messages: [{ role: 'user', content: 'hola' }],
    }))
    expect(res.status).toBe(404)
  })

  it('returns 404 when doctor is inactive', async () => {
    prismaMock.doctor.findUnique.mockResolvedValueOnce({ ...DOCTOR_ACTIVE, active: false })
    const { POST } = await import('@/app/api/sara/public/route')
    const res = await POST(makeRequest({
      slug: 'dr-lopez',
      messages: [{ role: 'user', content: 'hola' }],
    }))
    expect(res.status).toBe(404)
  })
})
