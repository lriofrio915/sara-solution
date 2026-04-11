import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  let email: string, password: string
  try {
    const body = await req.json()
    email = body.email
    password = body.password
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  // Build response object first so we can write Set-Cookie into it
  const response = NextResponse.json({ ok: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options ?? {})
          })
        },
      },
    },
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json(
      { error: 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.' },
      { status: 401 },
    )
  }

  if (!data.session) {
    return NextResponse.json(
      { error: 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.' },
      { status: 401 },
    )
  }

  const isPatient = data.user?.user_metadata?.role === 'patient'
  // Overwrite the response body with the redirect target
  const finalResponse = NextResponse.json({
    ok: true,
    redirectTo: isPatient ? '/mi-salud' : '/dashboard',
  })
  // Copy the Set-Cookie headers from the draft response
  response.cookies.getAll().forEach(({ name, value, ...rest }) => {
    finalResponse.cookies.set(name, value, rest)
  })
  return finalResponse
}
