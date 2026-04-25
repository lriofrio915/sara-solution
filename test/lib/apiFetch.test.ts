import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch, apiPostJson } from '@/lib/apiFetch'

const fetchSpy = vi.spyOn(globalThis, 'fetch')

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('apiFetch', () => {
  beforeEach(() => { fetchSpy.mockReset() })
  afterEach(() => { fetchSpy.mockReset() })

  it('returns ok=true with parsed data on 200', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ id: 1, name: 'Ana' }))
    const r = await apiFetch<{ id: number; name: string }>('/api/x')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toEqual({ id: 1, name: 'Ana' })
  })

  it('returns ok=false with status and error on 422', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ error: 'Datos inválidos', details: { fieldErrors: { name: ['required'] } } }, 422))
    const r = await apiFetch('/api/x')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.status).toBe(422)
      expect(r.error).toBe('Datos inválidos')
      expect(r.details).toBeDefined()
    }
  })

  it('falls back to "HTTP <status>" error when body has no error field', async () => {
    fetchSpy.mockResolvedValue(new Response('', { status: 500 }))
    const r = await apiFetch('/api/x')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('HTTP 500')
  })

  it('returns timeout error when AbortSignal triggers', async () => {
    fetchSpy.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'TimeoutError' }))
    const r = await apiFetch('/api/x', { timeout: 50 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Request timeout or aborted')
  })

  it('returns network error message on generic failure', async () => {
    fetchSpy.mockRejectedValue(new Error('socket hang up'))
    const r = await apiFetch('/api/x')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('socket hang up')
  })
})

describe('apiPostJson', () => {
  beforeEach(() => { fetchSpy.mockReset() })

  it('serializes body and sets content-type', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ ok: true }))
    await apiPostJson('/api/x', { name: 'Ana' })
    expect(fetchSpy).toHaveBeenCalledOnce()
    const call = fetchSpy.mock.calls[0]
    const init = call[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ name: 'Ana' }))
    const headers = init.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
  })
})
