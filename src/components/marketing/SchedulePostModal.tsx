'use client'

import { useState } from 'react'

interface Props {
  postId: string
  onScheduled: (scheduledAt: string) => void
  onClose: () => void
  accentColor?: 'pink' | 'blue' | 'gray' | 'indigo'
}

export default function SchedulePostModal({ postId, onScheduled, onClose, accentColor = 'blue' }: Props) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Min date = today
  const today = new Date().toISOString().split('T')[0]

  const accent = {
    pink: 'bg-pink-600 hover:bg-pink-700 focus:ring-pink-400',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-400',
    gray: 'bg-gray-800 hover:bg-gray-900 focus:ring-gray-400',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400',
  }[accentColor]

  async function handleSchedule() {
    if (!date) { setError('Selecciona una fecha'); return }
    setSaving(true)
    setError(null)
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
      const res = await fetch(`/api/marketing/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt, status: 'SCHEDULED' }),
      })
      if (!res.ok) throw new Error('Error al programar')
      onScheduled(scheduledAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl w-full max-w-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Programar publicación</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Fecha */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Fecha</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Hora</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSchedule} disabled={saving || !date}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors ${accent}`}>
              {saving ? 'Guardando...' : 'Programar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
