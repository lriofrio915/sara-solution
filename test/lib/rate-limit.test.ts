/**
 * Unit tests — src/lib/rate-limit.ts
 *
 * Regresión del incidente de latencia: con el retry por defecto de @upstash/redis
 * (5 intentos, backoff exp(n)*50) una instancia caída añadía 4.24s a CADA request
 * de /api/patients, /api/prescriptions, /api/auth, /api/arco, /api/fhir y las rutas
 * públicas — incluso a las que devolvían 404, porque el coste es del middleware.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const limitMock = vi.fn()

vi.mock('@upstash/redis', () => ({ Redis: class { constructor(public cfg: unknown) {} } }))
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    class { limit = limitMock },
    { slidingWindow: () => ({}) },
  ),
}))

const { applyRateLimit } = await import('@/lib/rate-limit')

function req(pathname: string) {
  return new NextRequest(`https://www.consultorio.site${pathname}`, {
    headers: { 'x-forwarded-for': '203.0.113.10' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
})
afterEach(() => { vi.useRealTimers() })

describe('applyRateLimit', () => {
  it('deja pasar la request cuando el limiter la permite', async () => {
    limitMock.mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: Date.now() + 60_000 })
    expect(await applyRateLimit(req('/api/patients'), '/api/patients')).toBeNull()
  })

  it('devuelve 429 con Retry-After cuando se supera el límite', async () => {
    limitMock.mockResolvedValue({ success: false, limit: 60, remaining: 0, reset: Date.now() + 30_000 })
    const res = await applyRateLimit(req('/api/patients'), '/api/patients')
    expect(res?.status).toBe(429)
    expect(res?.headers.get('Retry-After')).toBeTruthy()
    expect(res?.headers.get('X-RateLimit-Limit')).toBe('60')
  })

  it('no toca Redis en rutas sin limiter configurado', async () => {
    expect(await applyRateLimit(req('/api/exam-orders'), '/api/exam-orders')).toBeNull()
    expect(limitMock).not.toHaveBeenCalled()
  })

  it('deja pasar la request si Redis está colgado, sin esperar más del techo', async () => {
    // Redis que nunca resuelve: es el caso que costaba 4.24s en producción.
    limitMock.mockImplementation(() => new Promise(() => {}))
    const started = Date.now()
    const res = await applyRateLimit(req('/api/patients'), '/api/patients')
    const elapsed = Date.now() - started
    expect(res).toBeNull()          // falla en abierto
    expect(elapsed).toBeLessThan(500)
  })

  it('propaga el rechazo de Redis para que el middleware falle en abierto', async () => {
    limitMock.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(applyRateLimit(req('/api/patients'), '/api/patients')).rejects.toThrow()
  })

  it('no aplica rate limit si Upstash no está configurado', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    vi.resetModules()
    const fresh = await import('@/lib/rate-limit')
    expect(await fresh.applyRateLimit(req('/api/patients'), '/api/patients')).toBeNull()
  })

  it('acepta las credenciales KV_REST_API_* que inyecta el Marketplace de Vercel', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    process.env.KV_REST_API_URL = 'https://fake.upstash.io'
    process.env.KV_REST_API_TOKEN = 'fake-token'
    vi.resetModules()
    const fresh = await import('@/lib/rate-limit')
    limitMock.mockResolvedValue({ success: false, limit: 60, remaining: 0, reset: Date.now() + 30_000 })
    const res = await fresh.applyRateLimit(req('/api/patients'), '/api/patients')
    expect(res?.status).toBe(429)
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
  })
})
