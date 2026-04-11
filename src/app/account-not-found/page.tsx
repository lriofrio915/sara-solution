'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SaraLogo from '@/components/SaraLogo'

export default function AccountNotFoundPage() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
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
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Tu sesión de Supabase está activa, pero no encontramos ningún consultorio
          asociado a esta cuenta. Esto puede ocurrir si el perfil fue eliminado o
          si iniciaste sesión con una cuenta diferente.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl hover:bg-primary/90 transition-colors shadow-md"
          >
            Cerrar sesión e intentar de nuevo
          </button>
          <a
            href="mailto:soporte@consultorio.site"
            className="block w-full text-sm text-gray-500 hover:text-primary transition-colors py-2"
          >
            Contactar soporte: soporte@consultorio.site
          </a>
        </div>
      </div>
    </div>
  )
}
