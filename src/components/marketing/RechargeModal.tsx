'use client'

import { useState } from 'react'
import { CREDIT_PACKAGES, SARA_CREDIT_COSTS } from '@/lib/kie-ai'

interface Props {
  currentCredits: number
  onClose: () => void
  onSuccess: () => void
}

export default function RechargeModal({ currentCredits, onClose, onSuccess }: Props) {
  const [selectedPkg, setSelectedPkg] = useState(1) // default: 250 cr / $10
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const pkg = CREDIT_PACKAGES[selectedPkg]

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/marketing/credits/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageIndex: selectedPkg }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar solicitud')
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">

        {sent ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">¡Solicitud enviada!</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Tu solicitud de <strong>{pkg.credits} créditos</strong> por <strong>${pkg.priceUsd} USD</strong> fue registrada.
              El admin activará tus créditos en menos de 24h tras confirmar el pago.
            </p>
            <button
              onClick={onSuccess}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recargar créditos Sara</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Saldo actual: {currentCredits} créditos</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Price info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                  ¿Qué puedes generar?
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <span>🖼️</span>
                  <span>Imagen IA profesional (Flux-2 Pro)</span>
                  <span className="ml-auto font-bold text-primary">{SARA_CREDIT_COSTS.IMAGE} cr.</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <span>🎬</span>
                  <span>Video corto 5 seg (Kling AI)</span>
                  <span className="ml-auto font-bold text-primary">{SARA_CREDIT_COSTS.VIDEO} cr.</span>
                </div>
              </div>

              {/* Package selector */}
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                  Elige un paquete
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {CREDIT_PACKAGES.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPkg(i)}
                      className={`flex flex-col items-center gap-0.5 p-3 rounded-xl border-2 transition-all ${
                        selectedPkg === i
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-gray-600 hover:border-primary/40'
                      }`}
                    >
                      <span className={`text-lg font-black ${selectedPkg === i ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`}>
                        {p.credits}
                      </span>
                      <span className="text-xs text-gray-400">créditos</span>
                      <span className={`text-sm font-bold mt-1 ${selectedPkg === i ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}>
                        ${p.priceUsd} USD
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                  📲 Instrucciones de pago
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Transfiere <strong>${pkg.priceUsd} USD</strong> a la siguiente cuenta y luego envía la solicitud:
                </p>
                <div className="text-sm text-blue-900 dark:text-blue-200 font-mono bg-blue-100 dark:bg-blue-900/40 rounded-lg px-3 py-2 select-all">
                  WhatsApp: +593 98 765 4321
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  El admin activará tus <strong>{pkg.credits} créditos</strong> en menos de 24h.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Enviando…' : 'Enviar solicitud →'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
