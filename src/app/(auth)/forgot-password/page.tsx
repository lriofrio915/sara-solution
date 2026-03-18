'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const redirectTo = 'https://consultorio.site/auth/callback?next=/reset-password'

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (resetError) {
        const isRateLimit = resetError.message?.toLowerCase().includes('rate') || resetError.status === 429
        setError(
          isRateLimit
            ? 'Demasiados intentos. Espera unos minutos antes de solicitar otro enlace.'
            : 'No se pudo enviar el correo. Verifica la dirección e intenta de nuevo.'
        )
        return
      }

      setSent(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado'
      setError(`No se pudo conectar con el servidor. ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <>
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ✉️
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Revisa tu correo</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Enviamos un enlace de recuperación a <strong>{email}</strong>.
            <br />
            Puede tardar unos minutos. Revisa también tu carpeta de spam.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="btn-outline w-full justify-center"
          >
            Enviar a otro correo
          </button>
          <Link href="/login" className="btn-primary w-full justify-center">
            Volver al inicio de sesión
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h2>
        <p className="text-gray-500 mt-1 text-sm">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

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

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-100 text-center">
        <Link href="/login" className="text-sm text-gray-500 hover:text-primary transition-colors">
          ← Volver al inicio de sesión
        </Link>
      </div>
    </>
  )
}
