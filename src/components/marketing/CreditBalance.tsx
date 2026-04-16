'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import RechargeModal from './RechargeModal'

// ─── Context to share credit balance across components ────────

interface CreditContextValue {
  credits: number | null
  refresh: () => void
}

export const CreditContext = createContext<CreditContextValue>({ credits: null, refresh: () => {} })

export function useCreditBalance() {
  return useContext(CreditContext)
}

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState<number | null>(null)

  const refresh = useCallback(() => {
    fetch('/api/marketing/credits')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.credits !== undefined) setCredits(d.credits) })
      .catch(() => {})
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <CreditContext.Provider value={{ credits, refresh }}>
      {children}
    </CreditContext.Provider>
  )
}

// ─── Widget component ─────────────────────────────────────────

export default function CreditBalance() {
  const { credits, refresh } = useCreditBalance()
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-primary/50 transition-colors text-sm"
      >
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <path strokeLinecap="round" d="M2 10h20"/>
        </svg>
        <span className="font-semibold text-gray-900 dark:text-white">
          {credits === null ? '…' : credits}
        </span>
        <span className="text-gray-400 dark:text-slate-400 text-xs">créditos</span>
        <span className="text-primary text-xs font-bold">+ Recargar</span>
      </button>

      {showModal && (
        <RechargeModal
          currentCredits={credits ?? 0}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); refresh() }}
        />
      )}
    </>
  )
}
