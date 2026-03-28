'use client'

import { useState, useEffect } from 'react'
import { Gift, Check, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react'

interface ReferralRecord {
  id: string
  status: string
  rewardedAt: string | null
  createdAt: string
  referrer: { id: string; name: string; email: string; plan: string }
  referred: { id: string; name: string; email: string; plan: string }
}

const planBadge: Record<string, string> = {
  FREE:        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  TRIAL:       'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PRO_MENSUAL: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  PRO_ANUAL:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ENTERPRISE:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500',
}

const planLabel: Record<string, string> = {
  FREE: 'Free', TRIAL: 'Trial', PRO_MENSUAL: 'Pro Mensual', PRO_ANUAL: 'Pro Anual', ENTERPRISE: 'Enterprise',
}

export default function AdminReferidosPage() {
  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [rewardingId, setRewardingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'REWARDED'>('ALL')

  useEffect(() => {
    fetch('/api/admin/referidos')
      .then(r => r.json())
      .then(data => { setReferrals(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleReward(referral: ReferralRecord) {
    if (!confirm(`¿Marcar como recompensado y acreditar 1 mes gratis a ${referral.referrer.name} y ${referral.referred.name}?`)) return
    setRewardingId(referral.id)
    try {
      const res = await fetch(`/api/admin/referidos/${referral.id}/reward`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? 'Error'); return }
      setReferrals(prev => prev.map(r =>
        r.id === referral.id ? { ...r, status: 'REWARDED', rewardedAt: new Date().toISOString() } : r
      ))
    } finally {
      setRewardingId(null)
    }
  }

  const filtered = referrals.filter(r => filter === 'ALL' || r.status === filter)
  const pending = referrals.filter(r => r.status === 'PENDING').length
  const rewarded = referrals.filter(r => r.status === 'REWARDED').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-300">Total</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{loading ? '—' : referrals.length}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-300">Pendientes</p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{loading ? '—' : pending}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-300">Recompensados</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{loading ? '—' : rewarded}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['ALL', 'PENDING', 'REWARDED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary/30 hover:text-primary'
            }`}
          >
            {f === 'ALL' ? 'Todos' : f === 'PENDING' ? 'Pendientes' : 'Recompensados'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Referidor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Referido</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Plan referido</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden lg:table-cell">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Gift size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-slate-400">No hay referidos en esta categoría</p>
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{r.referrer.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-400">{r.referrer.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{r.referred.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-400">{r.referred.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${planBadge[r.referred.plan] ?? planBadge.FREE}`}>
                        {planLabel[r.referred.plan] ?? r.referred.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'REWARDED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <Check size={10} />
                          Recompensado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Clock size={10} />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500 hidden lg:table-cell">
                      {new Date(r.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'PENDING' ? (
                        <button
                          onClick={() => handleReward(r)}
                          disabled={rewardingId === r.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Gift size={12} />
                          {rewardingId === r.id ? 'Procesando…' : 'Recompensar'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {r.rewardedAt ? new Date(r.rewardedAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-5 text-sm">
        <p className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Flujo de recompensas</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400">
          <li>Doctor A comparte su enlace → Doctor B se registra (estado: Pendiente)</li>
          <li>Admin activa plan PRO al Doctor B desde SQL o admin panel</li>
          <li>Admin hace clic en <strong>Recompensar</strong> aquí → ambos doctores reciben +1 mes en su saldo</li>
          <li>Al renovar, el doctor contacta soporte y se descuenta del pago</li>
        </ol>
      </div>
    </div>
  )
}
