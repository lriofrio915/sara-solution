'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import SaraLogo from '@/components/SaraLogo'
import { getInitials } from '@/lib/utils'
import type { AssistantDoctor } from '@/lib/doctor-auth'

export default function SelectDoctorClient({ doctors }: { doctors: AssistantDoctor[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSelect(doctorId: string) {
    setLoading(doctorId)
    setError(null)
    try {
      const res = await fetch('/api/assistant/switch-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error al seleccionar médico')
      }
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <SaraLogo size="md" />
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Selecciona el consultorio
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Tienes acceso a múltiples consultorios. ¿Con cuál deseas trabajar hoy?
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        {/* Doctor cards */}
        <div className="space-y-3">
          {doctors.map(doc => {
            const initials = getInitials(doc.doctorName)
            const isLoading = loading === doc.doctorId
            return (
              <button
                key={doc.doctorId}
                onClick={() => handleSelect(doc.doctorId)}
                disabled={loading !== null}
                className="w-full flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-left hover:border-primary hover:shadow-md dark:hover:border-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {/* Avatar */}
                {doc.avatarUrl ? (
                  <Image
                    src={doc.avatarUrl}
                    alt={doc.doctorName}
                    width={52}
                    height={52}
                    className="w-13 h-13 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-base flex-shrink-0" style={{ width: 52, height: 52 }}>
                    {initials}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">
                    {doc.doctorName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{doc.specialty}</p>
                  {doc.establishmentName && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
                      {doc.establishmentName}
                    </p>
                  )}
                </div>

                {/* Arrow / spinner */}
                <div className="flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors">
                  {isLoading ? (
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-gray-400 dark:text-slate-500">
          Puedes cambiar de consultorio en cualquier momento desde el menú lateral.
        </p>
      </div>
    </div>
  )
}
