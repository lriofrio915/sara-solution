import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
}

let rl: RateLimits | null = null

function getRateLimits(): RateLimits | null {
  if (rl) return rl
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const redis = new Redis({ url, token })
  rl = {
    arco:          new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,  '1 m'), prefix: 'rl:arco' }),
    auth:          new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:auth' }),
    prescriptions: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'rl:presc' }),
    patients:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'rl:patients' }),
    fhir:          new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'rl:fhir' }),
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

async function applyRateLimit(request: NextRequest, pathname: string): Promise<NextResponse | null> {
  const limits = getRateLimits()
  if (!limits) return null  // Upstash not configured — skip

  const ip = getRealIp(request)

  let limiter: Ratelimit | null = null
  if (pathname.startsWith('/api/arco'))                        limiter = limits.arco
  else if (pathname.startsWith('/api/auth'))                   limiter = limits.auth
  else if (pathname.startsWith('/api/prescriptions'))          limiter = limits.prescriptions
  else if (pathname.startsWith('/api/patients'))               limiter = limits.patients
  else if (pathname.startsWith('/api/fhir'))                   limiter = limits.fhir

  if (!limiter) return null

  const { success, limit, remaining, reset } = await limiter.limit(ip)
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

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')

  // Apply rate limiting to critical routes first (before any auth overhead)
  // Wrapped in try-catch so a Redis outage never blocks normal requests
  let rateLimitResponse: NextResponse | null = null
  try {
    rateLimitResponse = await applyRateLimit(request, pathname)
  } catch {
    // Redis unreachable — fail open (allow request through)
  }
  if (rateLimitResponse) return rateLimitResponse

  // For API routes that are only included for rate limiting, skip session mgmt
  if (isApiRoute) {
    return NextResponse.next()
  }

  // Supabase redirects auth errors (expired OTP, access denied, etc.) to the
  // Site URL ("/") with ?error= params. Catch them early and send to login.
  if (pathname === '/' && searchParams.get('error')) {
    const code = searchParams.get('error_code') ?? ''
    const msg = code === 'otp_expired'
      ? 'El+enlace+expiró+o+ya+fue+usado.+Solicita+uno+nuevo.'
      : 'Ocurrió+un+error+de+autenticación.+Intenta+de+nuevo.'
    return NextResponse.redirect(new URL(`/login?mensaje=${msg}`, request.url))
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add any logic between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser()

  const isPatient = user?.user_metadata?.role === 'patient'

  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password'

  const isDoctorRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/patients') ||
    pathname.startsWith('/appointments') ||
    pathname.startsWith('/prescriptions') ||
    pathname.startsWith('/exam-orders') ||
    pathname.startsWith('/certificates') ||
    pathname.startsWith('/marketing') ||
    pathname.startsWith('/sara') ||
    pathname.startsWith('/knowledge') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/reminders') ||
    pathname.startsWith('/admin')

  const isPatientRoute = pathname.startsWith('/mi-salud')

  const isProtectedRoute = isDoctorRoute || isPatientRoute

  const copyAndRedirect = (url: string) => {
    const redirect = NextResponse.redirect(new URL(url, request.url))
    supabaseResponse.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value))
    return redirect
  }

  // Not logged in → login
  if (!user && isProtectedRoute) return copyAndRedirect('/login')

  // Logged in + auth page → send to correct dashboard
  if (user && isAuthRoute) {
    return copyAndRedirect(isPatient ? '/mi-salud' : '/dashboard')
  }

  // Patient trying to access doctor routes → send to patient dashboard
  if (user && isPatient && isDoctorRoute) return copyAndRedirect('/mi-salud')

  // Doctor trying to access patient routes → send to doctor dashboard
  if (user && !isPatient && isPatientRoute) return copyAndRedirect('/dashboard')

  return supabaseResponse
}

export const config = {
  matcher: [
    // Page routes (session management + rate limiting)
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Critical API routes (rate limiting only)
    '/api/auth/:path*',
    '/api/arco/:path*',
    '/api/prescriptions/:path*',
    '/api/patients/:path*',
    '/api/fhir/:path*',
  ],
}
