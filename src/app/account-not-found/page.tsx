'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SaraLogo from '@/components/SaraLogo'

export default function AccountNotFoundPage() {
  const router = useRouter()
  const [recovering, setRecovering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleRecover() {
    setRecovering(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/recover', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al recuperar')
      // Doctor created (or already existed) — go to onboarding to fill in details
      router.push('/onboarding')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setRecovering(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="mb-8">
        <SaraLogo />
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-md p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-3xl mx-auto mb-5">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Cuenta no vinculada</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Tu sesión está activa pero no encontramos ningún consultorio asociado.
          Puedes recrear tu perfil de médico o cerrar sesión e intentar con otra cuenta.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleRecover}
            disabled={recovering}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl hover:bg-primary/90 transition-colors shadow-md disabled:opacity-60"
          >
            {recovering ? 'Recuperando...' : 'Recrear mi perfil de médico'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-gray-100 text-gray-700 font-semibold py-3.5 rounded-2xl hover:bg-gray-200 transition-colors"
          >
            Cerrar sesión e intentar de nuevo
          </button>
          <a
            href="mailto:soporte@consultorio.site"
            className="block w-full text-sm text-gray-400 hover:text-primary transition-colors py-2"
          >
            Contactar soporte: soporte@consultorio.site
          </a>
        </div>
      </div>
    </div>
  )
}
