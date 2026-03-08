'use client'

import { useState, useEffect } from 'react'

interface Certificate {
  id: string
  date: string
  content: string
  diagnosis: string | null
  treatment: string | null
  restDays: number | null
}

export default function PatientCertificadosPage() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/patient/me/certificates')
      .then((r) => r.json())
      .then(setCerts)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center pt-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-4 pb-20 sm:pb-0">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📋 Mis Certificados Médicos</h1>

      {!certs.length ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No tienes certificados emitidos</p>
        </div>
      ) : (
        certs.map((cert) => (
          <div key={cert.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === cert.id ? null : cert.id)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {new Date(cert.date).toLocaleDateString('es-EC', { dateStyle: 'long' })}
                </p>
                {cert.restDays && (
                  <span className="inline-block mt-1 text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
                    {cert.restDays} día{cert.restDays !== 1 ? 's' : ''} de reposo
                  </span>
                )}
                {cert.diagnosis && <p className="text-xs text-gray-400 mt-0.5">{cert.diagnosis}</p>}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round"
                className={`text-gray-400 transition-transform ${expanded === cert.id ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {expanded === cert.id && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                  {cert.content}
                </p>
                {cert.treatment && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Tratamiento</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{cert.treatment}</p>
                  </div>
                )}
                <button onClick={() => window.print()} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                  🖨️ Imprimir certificado
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
