import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// C6: Rate limiting — in-memory, per-IP, per-tier
// Suitable for single-process PM2 deployments. For multi-instance deployments
// replace with Upstash Redis or similar shared store.
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
let lastCleanup = Date.now()

function getRealIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

/**
 * Returns a 429 response if the IP has exceeded maxRequests within windowMs,
 * or null if the request is allowed.
 */
function checkRateLimit(
  ip: string,
  tier: string,
  maxRequests: number,
  windowMs: number
): NextResponse | null {
  const now = Date.now()

  // Periodic cleanup to prevent unbounded memory growth
  if (now - lastCleanup > 5 * 60 * 1000) {
    rateLimitStore.forEach((entry, key) => {
      if (entry.resetAt < now) rateLimitStore.delete(key)
    })
    lastCleanup = now
  }

  const key = `${ip}:${tier}`
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  entry.count++
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', retryAfter }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    )
  }

  return null
}

/**
 * Applies the appropriate rate limit tier for the given pathname.
 * Returns a 429 NextResponse if limited, or null to allow the request.
 */
function applyRateLimit(request: NextRequest, pathname: string): NextResponse | null {
  const ip = getRealIp(request)

  // ARCO (data rights): very strict — 5 req/min
  if (pathname.startsWith('/api/arco')) {
    return checkRateLimit(ip, 'arco', 5, 60_000)
  }

  // Auth pages & Supabase auth API: 10 req/min
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/api/auth')
  ) {
    return checkRateLimit(ip, 'auth', 10, 60_000)
  }

  // Prescriptions API: 30 req/min
  if (pathname.startsWith('/api/prescriptions')) {
    return checkRateLimit(ip, 'prescriptions', 30, 60_000)
  }

  // Patients API: 60 req/min
  if (pathname.startsWith('/api/patients')) {
    return checkRateLimit(ip, 'patients', 60, 60_000)
  }

  // FHIR R4 API: 60 req/min
  if (pathname.startsWith('/api/fhir')) {
    return checkRateLimit(ip, 'fhir', 60, 60_000)
  }

  return null
}

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')

  // Apply rate limiting to critical routes first (before any auth overhead)
  const rateLimitResponse = applyRateLimit(request, pathname)
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
