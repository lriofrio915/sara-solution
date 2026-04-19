'use client'

import { useState } from 'react'
import { SARA_CREDIT_COSTS } from '@/lib/kie-ai'
import { useCreditBalance } from './CreditBalance'

type AspectRatio = '1:1' | '4:5' | '16:9'
type StyleKey = 'fotorrealista' | 'minimalista' | 'ilustracion' | 'acuarela' | 'corporativo'

interface Props {
  prompt: string
  defaultAspect?: AspectRatio
  socialPostId?: string
  downloadName?: string
  styleAnchor?: string
  onStyleAnchorChange?: (anchor: string) => void
}

const ASPECT_LABELS: Record<AspectRatio, string> = {
  '1:1':  'Cuadrado',
  '4:5':  'Vertical',
  '16:9': 'Horizontal',
}

const STYLE_OPTIONS: { key: StyleKey; label: string; icon: string }[] = [
  { key: 'fotorrealista', label: 'Foto real',    icon: '📷' },
  { key: 'minimalista',   label: 'Minimalista',  icon: '◻️' },
  { key: 'ilustracion',   label: 'Ilustración',  icon: '🎨' },
  { key: 'acuarela',      label: 'Acuarela',     icon: '🖌️' },
  { key: 'corporativo',   label: 'Corporativo',  icon: '💼' },
]

function pollinationsFallbackUrl(prompt: string) {
  const encoded = encodeURIComponent(
    `professional medical healthcare illustration, ${prompt}, clean modern style, no text, high quality`
  )
  return `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=1080&nologo=true&seed=42`
}

export default function KieImageGenerator({ prompt, defaultAspect = '1:1', socialPostId, downloadName = 'imagen-post', styleAnchor, onStyleAnchorChange }: Props) {
  const { credits, refresh } = useCreditBalance()
  const [aspect, setAspect] = useState<AspectRatio>(defaultAspect)
  const [styleKey, setStyleKey] = useState<StyleKey | null>(null)
  const [overlayText, setOverlayText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'polling' | 'done' | 'error'>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const [isFallback, setIsFallback] = useState(false)

  function handleStyleSelect(key: StyleKey) {
    const next = styleKey === key ? null : key
    setStyleKey(next)
    if (onStyleAnchorChange && next) {
      const descriptions: Record<StyleKey, string> = {
        fotorrealista: 'photorealistic professional photography studio lighting',
        minimalista: 'minimalist flat design clean white background simple geometric shapes',
        ilustracion: 'digital illustration flat vector art vibrant colors',
        acuarela: 'soft watercolor illustration pastel tones medical art style',
        corporativo: 'corporate photography professional sharp high contrast',
      }
      onStyleAnchorChange(descriptions[next])
    } else if (onStyleAnchorChange) {
      onStyleAnchorChange('')
    }
  }

  const hasCredits = credits !== null && credits >= SARA_CREDIT_COSTS.IMAGE
  const isGenerating = status === 'loading' || status === 'polling'

  async function saveImageUrl(url: string) {
    if (!socialPostId) return
    try {
      await fetch(`/api/marketing/posts/${socialPostId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      })
    } catch {
      // non-fatal
    }
  }

  async function handleFallback() {
    const url = pollinationsFallbackUrl(prompt)
    setImageUrl(url)
    setStatus('done')
    setIsFallback(true)
    setErrorMsg('')
    await saveImageUrl(url)
  }

  async function handleGenerate() {
    if (isGenerating) return
    setStatus('loading')
    setErrorMsg('')
    setImageUrl(null)
    setIsFallback(false)

    if (!hasCredits) {
      await handleFallback()
      return
    }

    try {
      const res = await fetch('/api/marketing/kie/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio: aspect, socialPostId, styleKey: styleKey ?? undefined, styleAnchor: styleAnchor ?? undefined, overlayText: overlayText.trim() || undefined }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_CREDITS') {
          await handleFallback()
        } else {
          setErrorMsg(data.error ?? 'Error al generar')
          setStatus('error')
        }
        return
      }

      refresh()
      await pollTask(data.taskId)
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.')
      setStatus('error')
    }
  }

  async function pollTask(taskId: string, attempt = 0) {
    if (attempt > 20) {
      // Timeout — use fallback instead of showing error
      await handleFallback()
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
        setIsFallback(false)
        refresh()
        await saveImageUrl(data.resultUrl)
      } else if (data.state === 'fail') {
        refresh()
        // KIE failed — use fallback
        await handleFallback()
      } else {
        await pollTask(taskId, attempt + 1)
      }
    } catch {
      await pollTask(taskId, attempt + 1)
    }
  }

  function handleDownload() {
    if (!imageUrl) return
    const proxyUrl = `/api/marketing/posts/download-image?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(downloadName)}`
    const a = document.createElement('a')
    a.href = proxyUrl
    a.download = downloadName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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

      {/* Style selector */}
      <div className="space-y-1.5">
        <p className="text-xs text-gray-400 dark:text-slate-500">Estilo visual</p>
        <div className="flex flex-wrap gap-1.5">
          {STYLE_OPTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => handleStyleSelect(s.key)}
              disabled={isGenerating}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                styleKey === s.key
                  ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-400 hover:border-gray-300 disabled:opacity-50'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overlay text input */}
      <div className="space-y-1">
        <p className="text-xs text-gray-400 dark:text-slate-500">Texto en la imagen <span className="font-normal">(opcional)</span></p>
        <input
          type="text"
          value={overlayText}
          onChange={e => setOverlayText(e.target.value.slice(0, 60))}
          disabled={isGenerating}
          placeholder="Ej: Consulta gratis hoy · Dr. Ramírez"
          className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary disabled:opacity-50"
        />
        {overlayText.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-slate-500 text-right">{overlayText.length}/60</p>
        )}
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
            <button
              onClick={handleFallback}
              className="mt-2 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Usar imagen de librería
            </button>
          </div>
        )}
      </div>

      {/* Cost + generate button */}
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-400 dark:text-slate-500">
          {isFallback ? (
            <span className="text-amber-500 font-medium">Imagen de librería</span>
          ) : (
            <>
              Costo: <span className="font-semibold text-gray-700 dark:text-gray-200">{SARA_CREDIT_COSTS.IMAGE} cr.</span>
              {' · '}
              Saldo: <span className={`font-semibold ${hasCredits ? 'text-gray-700 dark:text-gray-200' : 'text-red-500'}`}>
                {credits ?? '…'} cr.
              </span>
            </>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          {status === 'done' && imageUrl && (
            <>
              <button
                onClick={handleDownload}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Descargar
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50"
              >
                Nueva variación
              </button>
            </>
          )}
          {status !== 'done' && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isGenerating ? 'Generando…' : hasCredits ? '✨ Generar imagen' : '✨ Imagen alternativa'}
            </button>
          )}
        </div>
      </div>

      {!hasCredits && credits !== null && status !== 'done' && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Sin créditos IA — se usará imagen de librería automáticamente.
        </p>
      )}
    </div>
  )
}
