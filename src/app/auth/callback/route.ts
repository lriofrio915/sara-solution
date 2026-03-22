import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /auth/callback?code=xxx
// Supabase email confirmation and password-reset links land here.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]),
            )
          },
        },
      },
    )

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if this is a multi-doctor assistant
      // (a direct doctor account always goes straight to next/dashboard)
      const isDoctorAccount = await prisma.doctor.findFirst({
        where: { OR: [{ authId: data.user.id }, { email: data.user.email! }] },
        select: { id: true },
      })

      if (!isDoctorAccount) {
        const memberCount = await prisma.doctorMember.count({
          where: { authId: data.user.id, active: true },
        })
        if (memberCount > 1) {
          return NextResponse.redirect(`${origin}/select-doctor`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Link expired or invalid — redirect to login with friendly message
  return NextResponse.redirect(
    `${origin}/login?mensaje=El+enlace+expiró+o+ya+fue+usado.+Inicia+sesión+directamente.`,
  )
}
