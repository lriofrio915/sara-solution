'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

    // Error explícito en la URL → enlace inválido de inmediato
    if (params.get('error') || hashParams.get('error')) {
      setExpired(true)
      return
    }

    // Caso 1 — el callback server-side ya estableció la sesión en cookies.
    // getSession() la detecta de inmediato sin depender de eventos del cliente.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
        return
      }

      // Caso 2 — PKCE: el enlace llega directamente con ?code= (flujo sin callback)
      const code = params.get('code')
      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(({ error: exchErr }) => {
          if (exchErr) {
            setExpired(true)
          } else {
            setReady(true)
            window.history.replaceState({}, '', '/reset-password')
          }
        })
        return
      }

      // Caso 3 — Implicit/legacy: escuchar evento PASSWORD_RECOVERY (hash en URL)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') setReady(true)
      })

      const timer = setTimeout(() => setExpired(true), 15000)

      return () => {
        subscription.unsubscribe()
        clearTimeout(timer)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError('No se pudo actualizar la contraseña. Solicita un nuevo enlace.')
        return
      }

      setDone(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado'
      setError(`No se pudo conectar con el servidor. ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  // Success
  if (done) {
    return (
      <>
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ✅
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Contraseña actualizada</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.
          </p>
        </div>
        <Link href="/login" className="btn-primary w-full justify-center block text-center">
          Ir al inicio de sesión
        </Link>
      </>
    )
  }

  // Expired / invalid link
  if (expired && !ready) {
    return (
      <>
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ⏱️
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Enlace expirado</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Este enlace ya fue usado o expiró. Solicita uno nuevo y úsalo de inmediato.
          </p>
        </div>
        <Link href="/forgot-password" className="btn-primary w-full justify-center block text-center">
          Solicitar nuevo enlace
        </Link>
        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-gray-500 hover:text-primary transition-colors">
            ← Volver al inicio de sesión
          </Link>
        </div>
      </>
    )
  }

  // Verifying
  if (!ready) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Verificando enlace...
      </div>
    )
  }

  // Form
  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Nueva contraseña</h2>
        <p className="text-gray-500 mt-1 text-sm">
          Elige una contraseña segura para proteger tu cuenta.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
            autoComplete="new-password"
            className="input"
          />
        </div>

        <div>
          <label className="label">Confirmar contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu nueva contraseña"
            required
            autoComplete="new-password"
            className="input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
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
