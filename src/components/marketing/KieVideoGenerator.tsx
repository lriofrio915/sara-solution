'use client'

import { useState } from 'react'
import { SARA_CREDIT_COSTS } from '@/lib/kie-ai'
import { useCreditBalance } from './CreditBalance'

interface Props {
  prompt: string
  socialPostId?: string
}

export default function KieVideoGenerator({ prompt, socialPostId }: Props) {
  const { credits, refresh } = useCreditBalance()
  const [status, setStatus] = useState<'idle' | 'loading' | 'polling' | 'done' | 'error'>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [elapsed, setElapsed] = useState(0)

  const hasCredits = credits !== null && credits >= SARA_CREDIT_COSTS.VIDEO
  const isGenerating = status === 'loading' || status === 'polling'

  async function handleGenerate() {
    if (!hasCredits || isGenerating) return
    setStatus('loading')
    setErrorMsg('')
    setVideoUrl(null)
    setElapsed(0)

    try {
      const res = await fetch('/api/marketing/kie/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, socialPostId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.code === 'INSUFFICIENT_CREDITS' ? 'Sin créditos suficientes.' : (data.error ?? 'Error al generar'))
        setStatus('error')
        return
      }

      refresh()
      await pollTask(data.taskId)
    } catch {
      setErrorMsg('Error de conexión.')
      setStatus('error')
    }
  }

  async function pollTask(taskId: string, attempt = 0) {
    if (attempt > 40) { // max 120s
      setErrorMsg('La generación tardó demasiado. Tus créditos serán reembolsados.')
      setStatus('error')
      return
    }
    setStatus('polling')
    setElapsed(attempt * 3)

    await new Promise(r => setTimeout(r, 3000))

    try {
      const res = await fetch(`/api/marketing/kie/task?taskId=${encodeURIComponent(taskId)}&type=VIDEO`)
      const data = await res.json()

      if (data.state === 'success' && data.resultUrl) {
        setVideoUrl(data.resultUrl)
        setStatus('done')
        refresh()
      } else if (data.state === 'fail') {
        setErrorMsg('La generación falló. Tus créditos fueron reembolsados.')
        setStatus('error')
        refresh()
      } else {
        await pollTask(taskId, attempt + 1)
      }
    } catch {
      await pollTask(taskId, attempt + 1)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
        Video IA (Kling · 5 seg)
      </p>

      {/* Video preview area */}
      <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 w-full flex items-center justify-center" style={{ aspectRatio: '9/16', maxHeight: '320px' }}>
        {status === 'idle' && (
          <div className="text-center p-6">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.553A1 1 0 0121 8.382v7.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <p className="text-xs text-gray-400 dark:text-slate-500">Video para Reel/TikTok</p>
          </div>
        )}

        {isGenerating && (
          <div className="text-center p-6">
            <svg className="w-8 h-8 animate-spin text-primary mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Generando video… {elapsed > 0 ? `(${elapsed}s)` : ''}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Los videos tardan ~30-90 segundos</p>
          </div>
        )}

        {status === 'done' && videoUrl && (
          <video
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
          />
        )}

        {status === 'error' && (
          <div className="text-center p-6">
            <p className="text-xs text-red-500 text-center">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Cost + button */}
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-400 dark:text-slate-500">
          Costo: <span className="font-semibold text-gray-700 dark:text-gray-200">{SARA_CREDIT_COSTS.VIDEO} cr.</span>
          {' · '}
          Saldo: <span className={`font-semibold ${hasCredits ? 'text-gray-700 dark:text-gray-200' : 'text-red-500'}`}>
            {credits ?? '…'} cr.
          </span>
        </div>
        <div className="ml-auto flex gap-2">
          {status === 'done' && videoUrl && (
            <button
              onClick={() => {
                const a = document.createElement('a')
                a.href = `/api/marketing/posts/download-image?url=${encodeURIComponent(videoUrl)}&filename=video-reel`
                a.download = 'video-reel.mp4'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Descargar
            </button>
          )}
          <button
            onClick={hasCredits ? handleGenerate : undefined}
            disabled={isGenerating}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              hasCredits
                ? 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isGenerating ? 'Generando…' : hasCredits ? '🎬 Generar video' : 'Sin créditos →'}
          </button>
        </div>
      </div>
    </div>
  )
}
