import { NextResponse, type NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ---------------------------------------------------------------------------
// Rate limiting — Upstash Redis (shared across all Vercel instances)
// Falls back to allowing all requests if UPSTASH_REDIS_REST_URL is not set.
// ---------------------------------------------------------------------------

interface RateLimits {
  arco: Ratelimit
  auth: Ratelimit
  prescriptions: Ratelimit
  patients: Ratelimit
  fhir: Ratelimit
  public: Ratelimit
}

/** Latencia máxima que el rate limiting puede añadir a una request. */
const RATE_LIMIT_TIMEOUT_MS = 300

let rl: RateLimits | null = null

function getRateLimits(): RateLimits | null {
  if (rl) return rl
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const redis = new Redis({
    url,
    token,
    // El default del SDK son 5 intentos con backoff exp(n)*50, que suman 4.24s de
    // espera cuando Redis no responde. Como el limiter falla en abierto (ver el
    // try/catch de más abajo), reintentar no cambia el resultado: solo le cobra al
    // usuario 4 segundos por request. Un intento extra corto es suficiente.
    retry: { retries: 1, backoff: () => 150 },
  })
  rl = {
    arco:          new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,  '1 m'), prefix: 'rl:arco' }),
    auth:          new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:auth' }),
    prescriptions: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'rl:presc' }),
    patients:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'rl:patients' }),
    fhir:          new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'rl:fhir' }),
    public:        new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'rl:public' }),
  }
  return rl
}

function getRealIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

export async function applyRateLimit(request: NextRequest, pathname: string): Promise<NextResponse | null> {
  const limits = getRateLimits()
  if (!limits) return null  // Upstash not configured — skip

  const ip = getRealIp(request)

  let limiter: Ratelimit | null = null
  if (pathname.startsWith('/api/arco'))                        limiter = limits.arco
  else if (pathname.startsWith('/api/auth'))                   limiter = limits.auth
  else if (pathname.startsWith('/api/prescriptions'))          limiter = limits.prescriptions
  else if (pathname.startsWith('/api/patients'))               limiter = limits.patients
  else if (pathname.startsWith('/api/fhir'))                   limiter = limits.fhir
  // Public, unauthenticated routes — spam/abuse protection.
  // Webhooks (Hotmart, Evolution, leads/webhook) are intentionally excluded:
  // they come from trusted third parties with header secrets and may legitimately burst.
  else if (pathname.startsWith('/api/sara/public'))            limiter = limits.public
  else if (pathname.startsWith('/api/public-chat'))            limiter = limits.public
  else if (pathname === '/api/landing-chat')                   limiter = limits.public
  else if (pathname === '/api/contact')                        limiter = limits.public
  else if (pathname === '/api/leads/public')                   limiter = limits.public
  else if (pathname === '/api/patient-portal')                 limiter = limits.public
  else if (pathname.startsWith('/api/public/'))                limiter = limits.public

  if (!limiter) return null

  // Techo duro: aunque el SDK reintente o la red se quede colgada, el rate limiting
  // nunca puede añadir más de RATE_LIMIT_TIMEOUT_MS a la latencia de una request.
  // El timeout se trata como "permitir", el mismo criterio de fallo en abierto que
  // ya aplica el try/catch del middleware ante una caída de Redis.
  const result = await Promise.race([
    limiter.limit(ip),
    new Promise<null>(resolve => setTimeout(() => resolve(null), RATE_LIMIT_TIMEOUT_MS)),
  ])
  if (!result) return null

  const { success, limit, remaining, reset } = result
  if (success) return null

  const retryAfter = Math.ceil((reset - Date.now()) / 1000)
  return new NextResponse(
    JSON.stringify({ error: 'Too Many Requests', retryAfter }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
      },
    }
  )
}
