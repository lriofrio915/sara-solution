import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname

  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password'

  const isProtectedRoute =
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
    pathname.startsWith('/reminders')

  if (!user && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url)
    const redirect = NextResponse.redirect(loginUrl)
    // Copy refreshed cookies into the redirect response
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirect.cookies.set(cookie.name, cookie.value)
    })
    return redirect
  }

  if (user && isAuthRoute) {
    const dashboardUrl = new URL('/dashboard', request.url)
    const redirect = NextResponse.redirect(dashboardUrl)
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirect.cookies.set(cookie.name, cookie.value)
    })
    return redirect
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
