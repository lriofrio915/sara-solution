'use client'

import { useState } from 'react'
import { SARA_CREDIT_COSTS } from '@/lib/kie-ai'
import { useCreditBalance } from './CreditBalance'

type AspectRatio = '1:1' | '4:5' | '16:9'

interface Props {
  prompt: string
  defaultAspect?: AspectRatio
  socialPostId?: string
  downloadName?: string
}

const ASPECT_LABELS: Record<AspectRatio, string> = {
  '1:1':  'Cuadrado',
  '4:5':  'Vertical',
  '16:9': 'Horizontal',
}

export default function KieImageGenerator({ prompt, defaultAspect = '1:1', socialPostId, downloadName = 'imagen-post.jpg' }: Props) {
  const { credits, refresh } = useCreditBalance()
  const [aspect, setAspect] = useState<AspectRatio>(defaultAspect)
  const [status, setStatus] = useState<'idle' | 'loading' | 'polling' | 'done' | 'error'>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [pollCount, setPollCount] = useState(0)

  const hasCredits = credits !== null && credits >= SARA_CREDIT_COSTS.IMAGE
  const isGenerating = status === 'loading' || status === 'polling'

  async function handleGenerate() {
    if (!hasCredits || isGenerating) return
    setStatus('loading')
    setErrorMsg('')
    setImageUrl(null)

    try {
      const res = await fetch('/api/marketing/kie/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio: aspect, socialPostId }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_CREDITS') {
          setErrorMsg('Sin créditos suficientes.')
        } else {
          setErrorMsg(data.error ?? 'Error al generar')
        }
        setStatus('error')
        return
      }

      refresh() // update balance display
      await pollTask(data.taskId)
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.')
      setStatus('error')
    }
  }

  async function pollTask(taskId: string, attempt = 0) {
    if (attempt > 20) { // max 60s (20 × 3s)
      setErrorMsg('La generación tardó demasiado. Tus créditos serán reembolsados.')
      setStatus('error')
      return
    }
    setStatus('polling')
    setPollCount(attempt)

    await new Promise(r => setTimeout(r, 3000))

    try {
      const res = await fetch(`/api/marketing/kie/task?taskId=${encodeURIComponent(taskId)}&type=IMAGE`)
      const data = await res.json()

      if (data.state === 'success' && data.resultUrl) {
        setImageUrl(data.resultUrl)
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
        Imagen IA profesional
      </p>

      {/* Aspect ratio selector */}
      <div className="flex gap-1.5">
        {(Object.keys(ASPECT_LABELS) as AspectRatio[]).map(a => (
          <button
            key={a}
            onClick={() => setAspect(a)}
            disabled={isGenerating}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
              aspect === a
                ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-400 hover:border-gray-300 disabled:opacity-50'
            }`}
          >
            {ASPECT_LABELS[a]}
          </button>
        ))}
      </div>

      {/* Image preview area */}
      <div
        className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 w-full flex items-center justify-center"
        style={{ aspectRatio: aspect.replace(':', '/'), minHeight: '120px' }}
      >
        {status === 'idle' && (
          <div className="text-center p-6">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-gray-400 dark:text-slate-500">Genera tu imagen aquí</p>
          </div>
        )}

        {isGenerating && (
          <div className="text-center p-6">
            <svg className="w-8 h-8 animate-spin text-primary mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {status === 'loading' ? 'Iniciando…' : `Generando… (~${Math.max(0, 15 - pollCount * 3)}s)`}
            </p>
          </div>
        )}

        {status === 'done' && imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={imageUrl} alt={prompt} className="w-full h-full object-cover" />
        )}

        {status === 'error' && (
          <div className="text-center p-6">
            <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-red-500 dark:text-red-400 text-center">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Cost + generate button */}
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-400 dark:text-slate-500">
          Costo: <span className="font-semibold text-gray-700 dark:text-gray-200">{SARA_CREDIT_COSTS.IMAGE} cr.</span>
          {' · '}
          Saldo: <span className={`font-semibold ${hasCredits ? 'text-gray-700 dark:text-gray-200' : 'text-red-500'}`}>
            {credits ?? '…'} cr.
          </span>
        </div>
        <div className="ml-auto flex gap-2">
          {status === 'done' && imageUrl && (
            <>
              <a
                href={imageUrl}
                download={downloadName}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Descargar
              </a>
              <button
                onClick={handleGenerate}
                disabled={!hasCredits || isGenerating}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50"
              >
                Nueva variación
              </button>
            </>
          )}
          {status !== 'done' && (
            <button
              onClick={hasCredits ? handleGenerate : undefined}
              disabled={isGenerating}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                hasCredits
                  ? 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isGenerating ? 'Generando…' : hasCredits ? '✨ Generar imagen' : 'Sin créditos →'}
            </button>
          )}
        </div>
      </div>

      {!hasCredits && credits !== null && (
        <p className="text-xs text-red-500">
          No tienes suficientes créditos. Recarga desde el botón arriba.
        </p>
      )}
    </div>
  )
}
