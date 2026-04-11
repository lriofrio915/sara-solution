'use client'

import { useState, useEffect, Suspense, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useFormState } from 'react-dom'
import { Eye, EyeOff } from 'lucide-react'
import { loginAction } from './actions'

function InfoMessage({ setInfo }: { setInfo: (v: string | null) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const msg = searchParams.get('mensaje')
    if (msg) setInfo(decodeURIComponent(msg))
  }, [searchParams, setInfo])
  return null
}

function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    >
      {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, {})
  const [isPending, startTransition] = useTransition()
  const [info, setInfo]               = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(() => {
      formAction(new FormData(e.currentTarget))
    })
  }

  return (
    <>
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

      {state.error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {state.error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Correo electrónico</label>
          <input
            type="email"
            name="email"
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
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <SubmitButton loading={isPending} />
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
