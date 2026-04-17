'use client'

import { useState, useEffect, useCallback } from 'react'

const SUPERADMIN_EMAIL = 'lriofrio915@gmail.com'

interface Recharge {
  id: string
  credits: number
  amountUsd: string
  status: string
  createdAt: string
  doctor: { id: string; name: string; email: string }
}

interface CreditBalance {
  doctorId: string
  credits: number
  doctor: { id: string; name: string; email: string }
}

export default function AdminCreditsPage() {
  const [pending, setPending] = useState<Recharge[]>([])
  const [allCredits, setAllCredits] = useState<CreditBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [kieBalance, setKieBalance] = useState<number | null>(null)
  const [kieError, setKieError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [credRes, kieRes] = await Promise.all([
        fetch('/api/admin/credits'),
        fetch('/api/admin/kie-balance'),
      ])
      if (!credRes.ok) { setError('No autorizado'); return }
      const data = await credRes.json()
      setPending(data.pending)
      setAllCredits(data.allCredits)

      const kieData = await kieRes.json()
      if (kieData.error) setKieError(kieData.error)
      else setKieBalance(kieData.balance)
    } catch {
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAction(id: string, approved: boolean) {
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/credits/recharge/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      if (res.ok) await load()
    } finally {
      setProcessing(null)
    }
  }

  if (error) return (
    <div className="p-8 text-center text-red-500">{error}</div>
  )

  if (loading) return (
    <div className="p-8 flex justify-center">
      <svg className="w-6 h-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Administrar Créditos Sara</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Aprueba o rechaza solicitudes de recarga de médicos</p>
      </div>

      {/* Kie.AI pool balance */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤖</span>
          <span className="text-sm font-semibold opacity-90">Pool de créditos Kie.AI (disponibles para distribuir)</span>
        </div>
        {kieError ? (
          <div className="mt-2 rounded-xl bg-amber-500/20 border border-amber-400/30 p-3 text-xs text-amber-200">
            <span className="font-semibold">⚠️ Sin acceso: </span>{kieError}
          </div>
        ) : (
          <p className="text-4xl font-extrabold tracking-tight mt-1">
            {kieBalance === null ? '…' : kieBalance.toLocaleString()} <span className="text-xl font-medium opacity-75">cr.</span>
          </p>
        )}
      </div>

      {/* Pending recharges */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          Solicitudes pendientes
          {pending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold">
              {pending.length}
            </span>
          )}
        </h3>

        {pending.length === 0 ? (
          <div className="p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center text-sm text-gray-400">
            No hay solicitudes pendientes
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.doctor.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{r.doctor.email}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-primary">{r.credits} cr.</p>
                  <p className="text-xs text-gray-400">${r.amountUsd} USD</p>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleAction(r.id, true)}
                    disabled={processing === r.id}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {processing === r.id ? '…' : '✓ Aprobar'}
                  </button>
                  <button
                    onClick={() => handleAction(r.id, false)}
                    disabled={processing === r.id}
                    className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                  >
                    ✗
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All balances */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Saldos actuales</h3>
        {allCredits.length === 0 ? (
          <p className="text-sm text-gray-400">Ningún médico tiene créditos aún</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Médico</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Créditos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {allCredits.map(c => {
                  const isAdmin = c.doctor.email === SUPERADMIN_EMAIL
                  const displayCredits = isAdmin && kieBalance !== null ? kieBalance : c.credits
                  return (
                    <tr key={c.doctorId} className="bg-white dark:bg-gray-800">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {c.doctor.name}
                          {isAdmin && <span className="ml-2 text-xs text-violet-500 font-semibold">(pool kie.ai)</span>}
                        </p>
                        <p className="text-xs text-gray-400">{c.doctor.email}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${displayCredits > 0 ? 'text-primary' : 'text-gray-400'}`}>
                          {displayCredits}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
