import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

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
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
