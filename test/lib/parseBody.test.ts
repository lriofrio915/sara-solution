import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { parseBody } from '@/lib/validation/parseBody'

const TestSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().min(0),
})

function makeRequest(body: string | undefined, contentType = 'application/json'): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  })
}

describe('parseBody', () => {
  it('returns ok with parsed data on valid input', async () => {
    const req = makeRequest(JSON.stringify({ name: 'Ana', age: 30 }))
    const result = await parseBody(req, TestSchema)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ name: 'Ana', age: 30 })
    }
  })

  it('returns 400 on malformed JSON', async () => {
    const req = makeRequest('{not json')
    const result = await parseBody(req, TestSchema)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(400)
      const body = await result.response.json()
      expect(body.error).toBe('Invalid JSON')
    }
  })

  it('returns 422 with details on shape mismatch', async () => {
    const req = makeRequest(JSON.stringify({ name: 'A', age: -1 }))
    const result = await parseBody(req, TestSchema)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(422)
      const body = await result.response.json()
      expect(body.error).toBe('Datos inválidos')
      expect(body.details).toBeDefined()
      expect(body.details.fieldErrors).toBeDefined()
    }
  })

  it('returns 422 when required fields are missing', async () => {
    const req = makeRequest(JSON.stringify({}))
    const result = await parseBody(req, TestSchema)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(422)
    }
  })

  it('returns 400 on empty body', async () => {
    const req = makeRequest('')
    const result = await parseBody(req, TestSchema)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(400)
    }
  })
})
