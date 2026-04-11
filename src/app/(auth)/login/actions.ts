'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type LoginState = {
  error?: string
  success?: boolean
  redirectTo?: string
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    },
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.' }
  }

  if (!data.session) {
    return { error: 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.' }
  }

  const isPatient = data.user?.user_metadata?.role === 'patient'
  return { success: true, redirectTo: isPatient ? '/mi-salud' : '/dashboard' }
}
