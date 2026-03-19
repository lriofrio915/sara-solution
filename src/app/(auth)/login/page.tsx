'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Separated into its own component so it can be wrapped in Suspense
// (Next.js requires useSearchParams to be inside a Suspense boundary)
function InfoMessage({ setInfo }: { setInfo: (v: string | null) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const msg = searchParams.get('mensaje')
    if (msg) setInfo(decodeURIComponent(msg))
  }, [searchParams, setInfo])
  return null
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError('Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.')
        return
      }

      const isPatient = data.user?.user_metadata?.role === 'patient'
      window.location.href = isPatient ? '/mi-salud' : '/dashboard'
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado'
      setError(`No se pudo conectar con el servidor de autenticación. ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Reads ?mensaje= param without blocking static prerender */}
      <Suspense fallback={null}>
        <InfoMessage setInfo={setInfo} />
      </Suspense>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bienvenido de vuelta</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Ingresa a tu cuenta de Sara Medical</p>
      </div>

      {info && (
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl">
          {info}
        </div>
      )}

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctora@ejemplo.com"
            required
            autoComplete="email"
            className="input"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">Contraseña</label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className="input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="text-center text-gray-500 text-sm mt-6">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-primary font-semibold hover:underline">
          Regístrate
        </Link>
      </p>

      <div className="mt-8 pt-8 border-t border-gray-100 text-center">
        <Link href="/" className="text-gray-400 text-sm hover:text-gray-600">
          ← Volver al sitio web
        </Link>
      </div>
    </>
  )
}
