'use client'

import { useState, useRef } from 'react'
import { CREDIT_PACKAGES, SARA_CREDIT_COSTS } from '@/lib/kie-ai'
import { createClient } from '@/lib/supabase/client'

type PayMethod = 'TRANSFER' | 'CRYPTO' | 'CARD'

interface Props {
  currentCredits: number
  onClose: () => void
  onSuccess: () => void
}

export default function RechargeModal({ currentCredits, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedPkg, setSelectedPkg] = useState(1)
  const [payMethod, setPayMethod] = useState<PayMethod>('TRANSFER')
  const [copied, setCopied] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const pkg = CREDIT_PACKAGES[selectedPkg]

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFile(file)
    setUploading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `proofs/${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(path)
      setProofUrl(publicUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir comprobante')
      setProofFile(null)
    } finally {
      setUploading(false)
    }
  }

  const HOTMART_LINKS: Record<number, string> = {
    0: 'https://pay.hotmart.com/X105434245R?checkoutMode=2',
    1: 'https://pay.hotmart.com/Y105434146U?checkoutMode=2',
  }

  function handleCardPayment() {
    const url = HOTMART_LINKS[selectedPkg]
    if (url) window.open(url, '_blank')
  }

  async function handleSubmit() {
    if (payMethod !== 'CARD' && !proofUrl) {
      setError('Sube el comprobante de pago antes de enviar.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/marketing/credits/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageIndex: selectedPkg, proofUrl, payMethod }),
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  function copyWallet() {
    navigator.clipboard.writeText('TNJ8XKBVv6GRFJzLxVsTQLBSqRUh8f9VZD').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">

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
            <button onClick={onSuccess} className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors">
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

            {/* Step indicator */}
            <div className="flex items-center gap-2 px-6 pt-4">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                    {s}
                  </div>
                  <span className={`text-xs ${step >= s ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>
                    {s === 1 ? 'Paquete' : 'Pago'}
                  </span>
                  {s === 1 && <div className="w-8 h-px bg-gray-200 dark:bg-gray-600 mx-1" />}
                </div>
              ))}
            </div>

            <div className="p-6 space-y-5">

              {/* ── STEP 1: Package selection ── */}
              {step === 1 && (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">¿Qué puedes generar?</p>
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span>🖼️</span><span>Imagen IA (Flux-2 Pro)</span>
                      <span className="ml-auto font-bold text-primary">{SARA_CREDIT_COSTS.IMAGE} cr.</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span>🎬</span><span>Video 5 seg (Kling AI)</span>
                      <span className="ml-auto font-bold text-primary">{SARA_CREDIT_COSTS.VIDEO} cr.</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Elige un paquete</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CREDIT_PACKAGES.map((p, i) => (
                        <button key={i} onClick={() => setSelectedPkg(i)}
                          className={`flex flex-col items-center gap-0.5 p-3 rounded-xl border-2 transition-all ${selectedPkg === i ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-gray-200 dark:border-gray-600 hover:border-primary/40'}`}>
                          <span className={`text-lg font-black ${selectedPkg === i ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`}>{p.credits}</span>
                          <span className="text-xs text-gray-400">créditos</span>
                          <span className={`text-sm font-bold mt-1 ${selectedPkg === i ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}>${p.priceUsd} USD</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setStep(2)} className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors">
                    Continuar → Método de pago
                  </button>
                </>
              )}

              {/* ── STEP 2: Payment method ── */}
              {step === 2 && (
                <>
                  {/* Summary */}
                  <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 rounded-xl px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Paquete seleccionado</span>
                    <span className="font-bold text-primary">{pkg.credits} cr. · ${pkg.priceUsd} USD</span>
                  </div>

                  {/* Payment method tabs */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Método de pago</p>
                    <div className="flex gap-1.5 mb-4">
                      {(['TRANSFER', 'CRYPTO', 'CARD'] as PayMethod[]).map(m => (
                        <button key={m} onClick={() => { setPayMethod(m); setError('') }}
                          className={`flex-1 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${payMethod === m ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-primary/40'}`}>
                          {m === 'TRANSFER' ? '🏦 Banco' : m === 'CRYPTO' ? '₿ Cripto' : '💳 Tarjeta'}
                        </button>
                      ))}
                    </div>

                    {/* TRANSFER */}
                    {payMethod === 'TRANSFER' && (
                      <div className="space-y-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4 space-y-2 text-sm">
                          <p className="font-semibold text-blue-700 dark:text-blue-400">Banco de Guayaquil</p>
                          <div className="space-y-1 text-blue-800 dark:text-blue-300">
                            <div className="flex justify-between">
                              <span className="text-blue-600 dark:text-blue-400">Cuenta de ahorros:</span>
                              <button onClick={() => copyToClipboard('0053466219')} className="font-mono font-bold hover:text-blue-600 transition-colors">0053466219 📋</button>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-600 dark:text-blue-400">Titular:</span>
                              <span className="font-medium">Luis Riofrio Lopez</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-600 dark:text-blue-400">Cédula:</span>
                              <span className="font-mono">1500760895</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-600 dark:text-blue-400">Email:</span>
                              <span className="font-mono text-xs">lriofrio915@gmail.com</span>
                            </div>
                          </div>
                          <div className="pt-1 border-t border-blue-200 dark:border-blue-700/50">
                            <p className="text-blue-600 dark:text-blue-400 font-bold">Monto a transferir: ${pkg.priceUsd} USD</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">📎 Subir comprobante de pago</p>
                          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
                          <button onClick={() => fileRef.current?.click()} disabled={uploading}
                            className={`w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-colors ${proofUrl ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-primary/50 hover:text-primary'}`}>
                            {uploading ? 'Subiendo…' : proofUrl ? `✓ ${proofFile?.name ?? 'Comprobante subido'}` : 'Seleccionar archivo'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CRYPTO */}
                    {payMethod === 'CRYPTO' && (
                      <div className="space-y-3">
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50 rounded-xl p-4 space-y-2 text-sm">
                          <p className="font-semibold text-orange-700 dark:text-orange-400">Red: Tron (TRC20)</p>
                          <div className="space-y-1 text-orange-800 dark:text-orange-300">
                            <p className="text-orange-600 dark:text-orange-400 text-xs">Wallet USDT TRC20:</p>
                            <button onClick={copyWallet}
                              className={`w-full text-left font-mono text-xs rounded-lg px-3 py-2 break-all transition-colors ${copied ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-900/60'}`}>
                              {copied ? '✓ Copiado!' : 'TNJ8XKBVv6GRFJzLxVsTQLBSqRUh8f9VZD 📋'}
                            </button>
                            <p className="font-bold">Monto: ${pkg.priceUsd} USD en USDT</p>
                          </div>
                          <div className="pt-1 border-t border-orange-200 dark:border-orange-700/50">
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">⚠️ Solo enviar USDT en red TRC20 (Tron) — otros tokens se perderán</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">📎 Subir comprobante / captura de tx</p>
                          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
                          <button onClick={() => fileRef.current?.click()} disabled={uploading}
                            className={`w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-colors ${proofUrl ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-primary/50 hover:text-primary'}`}>
                            {uploading ? 'Subiendo…' : proofUrl ? `✓ ${proofFile?.name ?? 'Comprobante subido'}` : 'Seleccionar archivo'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CARD */}
                    {payMethod === 'CARD' && (
                      <div className="space-y-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4 space-y-2 text-sm">
                          <p className="font-semibold text-blue-700 dark:text-blue-400">💳 Pago con Visa / Mastercard</p>
                          <p className="text-blue-600 dark:text-blue-300 text-xs">
                            Serás redirigido a Hotmart para completar el pago de forma segura.
                            Tus créditos se activan automáticamente al confirmarse el pago.
                          </p>
                          <div className="pt-1 border-t border-blue-200 dark:border-blue-700/50">
                            <p className="font-bold text-blue-800 dark:text-blue-200">${pkg.priceUsd} USD · {pkg.credits} créditos</p>
                          </div>
                        </div>
                        <button
                          onClick={handleCardPayment}
                          className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
                        >
                          Pagar con Hotmart →
                        </button>
                      </div>
                    )}
                  </div>

                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setStep(1)}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      ← Atrás
                    </button>
                    {payMethod !== 'CARD' && (
                      <button onClick={handleSubmit} disabled={loading || uploading || !proofUrl}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
                        {loading ? 'Enviando…' : 'Enviar solicitud →'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
