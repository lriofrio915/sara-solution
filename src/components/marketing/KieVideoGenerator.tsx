'use client'

import { useState } from 'react'
import { VIDEO_DURATION_OPTIONS, SARA_CREDIT_COSTS, VideoDurationClips } from '@/lib/kie-ai'
import { useCreditBalance } from './CreditBalance'

interface Props {
  prompt: string
  socialPostId?: string
}

export default function KieVideoGenerator({ prompt, socialPostId }: Props) {
  const { credits, refresh } = useCreditBalance()
  const [mode, setMode] = useState<'text' | 'image'>('text')
  const [clips, setClips] = useState<VideoDurationClips>(3)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'polling' | 'extending' | 'done' | 'error'>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [extendStep, setExtendStep] = useState(0) // 0 = base clip, 1..N = extensions done

  const cost = SARA_CREDIT_COSTS.VIDEO_BY_CLIPS[clips]
  const hasCredits = credits !== null && credits >= cost
  const isGenerating = status === 'loading' || status === 'polling' || status === 'extending'
  const canGenerate = hasCredits && !isGenerating && (mode === 'text' || !!imageBase64)

  const totalSeconds = clips * 6
  const durationLabel = VIDEO_DURATION_OPTIONS.find(o => o.clips === clips)?.label ?? '6 seg'

  function handleModeChange(next: 'text' | 'image') {
    setMode(next)
    setImageBase64(null)
    setImagePreview(null)
    resetResult()
  }

  function handleClipsChange(next: VideoDurationClips) {
    setClips(next)
    resetResult()
  }

  function resetResult() {
    setStatus('idle')
    setVideoUrl(null)
    setErrorMsg('')
    setExtendStep(0)
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImageBase64(result)
      setImagePreview(result)
    }
    reader.readAsDataURL(file)
  }

  async function handleGenerate() {
    if (!canGenerate) return
    setStatus('loading')
    setErrorMsg('')
    setVideoUrl(null)
    setElapsed(0)
    setExtendStep(0)

    try {
      const res = await fetch('/api/marketing/kie/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          socialPostId,
          clips,
          imageBase64: mode === 'image' ? imageBase64 : undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.code === 'INSUFFICIENT_CREDITS' ? 'Sin créditos suficientes.' : (data.error ?? 'Error al generar'))
        setStatus('error')
        return
      }

      refresh()
      const { taskId, totalExtensions } = data as { taskId: string; totalExtensions: number }

      // Poll base clip
      setStatus('polling')
      const baseResult = await pollTaskForUrl(taskId)
      if (!baseResult) return

      // Chain extensions sequentially using recordTaskId (task_grok_XXX format)
      let prevRecordTaskId = baseResult.recordTaskId ?? taskId
      for (let i = 0; i < totalExtensions; i++) {
        setExtendStep(i + 1)
        setStatus('extending')
        setElapsed(0)

        const extRes = await fetch('/api/marketing/kie/video/extend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prevTaskId: prevRecordTaskId, prompt }),
        })
        const extData = await extRes.json()
        if (!extRes.ok) {
          setErrorMsg(extData.error ?? 'Error al extender el video.')
          setStatus('error')
          return
        }

        const extResult = await pollTaskForUrl(extData.taskId)
        if (!extResult) return

        prevRecordTaskId = extResult.recordTaskId ?? extData.taskId
        setVideoUrl(extResult.url)
      }

      if (totalExtensions === 0) setVideoUrl(baseResult.url)
      setStatus('done')
      refresh()
    } catch {
      setErrorMsg('Error de conexión.')
      setStatus('error')
    }
  }

  async function pollTaskForUrl(taskId: string, attempt = 0): Promise<{ url: string; recordTaskId?: string } | null> {
    if (attempt > 40) {
      setErrorMsg('La generación tardó demasiado. Tus créditos serán reembolsados.')
      setStatus('error')
      return null
    }
    setElapsed(attempt * 3)
    await new Promise(r => setTimeout(r, 3000))

    try {
      const res = await fetch(`/api/marketing/kie/task?taskId=${encodeURIComponent(taskId)}&type=VIDEO&refundCredits=${cost}`)
      const data = await res.json()

      if (data.state === 'success' && data.resultUrl) {
        return { url: data.resultUrl, recordTaskId: data.recordTaskId }
      }
      if (data.state === 'fail') {
        setErrorMsg('La generación falló. Tus créditos fueron reembolsados.')
        setStatus('error')
        refresh()
        return null
      }
      return pollTaskForUrl(taskId, attempt + 1)
    } catch {
      return pollTaskForUrl(taskId, attempt + 1)
    }
  }

  function progressLabel() {
    if (status === 'loading') return 'Preparando…'
    if (status === 'polling' && extendStep === 0) return `Generando clip base (6s)… ${elapsed > 0 ? `(${elapsed}s)` : ''}`
    if (status === 'extending') {
      const doneSeconds = (extendStep) * 6
      const targetSeconds = (extendStep + 1) * 6
      return `Extendiendo a ${targetSeconds}s… (${doneSeconds}s listos) ${elapsed > 0 ? `(${elapsed}s)` : ''}`
    }
    if (status === 'polling' && extendStep > 0) return `Procesando extensión ${extendStep}… ${elapsed > 0 ? `(${elapsed}s)` : ''}`
    return ''
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
        Video IA (Grok Imagine · hasta {totalSeconds}s)
      </p>

      {/* Mode toggle */}
      <div className="flex gap-1.5">
        {(['text', 'image'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border-2 transition-colors ${
              mode === m
                ? 'border-primary text-primary bg-primary/5 dark:bg-primary/10'
                : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300'
            }`}
          >
            {m === 'text' ? '✏️ Desde texto' : '🖼️ Desde imagen'}
          </button>
        ))}
      </div>

      {/* Duration selector */}
      <div className="flex gap-1.5">
        {VIDEO_DURATION_OPTIONS.map(opt => (
          <button
            key={opt.clips}
            type="button"
            onClick={() => handleClipsChange(opt.clips)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border-2 transition-colors ${
              clips === opt.clips
                ? 'border-primary text-primary bg-primary/5 dark:bg-primary/10'
                : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300'
            }`}
          >
            <span className="block">{opt.label}</span>
            <span className="block text-[10px] font-normal opacity-70">{opt.cost} cr</span>
          </button>
        ))}
      </div>

      {/* Image upload zone */}
      {mode === 'image' && (
        <label className="block cursor-pointer">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />
          <div className={`relative rounded-xl overflow-hidden border-2 border-dashed transition-colors flex items-center justify-center ${
            imagePreview ? 'border-primary/40' : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
          }`} style={{ aspectRatio: '16/9', maxHeight: '140px' }}>
            {imagePreview ? (
              <img src={imagePreview} alt="Imagen seleccionada" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <svg className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-400 dark:text-slate-500">Arrastra o haz clic para subir</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">JPG, PNG, WebP</p>
              </div>
            )}
            {imagePreview && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <span className="text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-lg">Cambiar imagen</span>
              </div>
            )}
          </div>
        </label>
      )}

      {/* Video preview area */}
      <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 w-full flex items-center justify-center" style={{ aspectRatio: '9/16', maxHeight: '320px' }}>
        {status === 'idle' && (
          <div className="text-center p-6">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.553A1 1 0 0121 8.382v7.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {mode === 'image' ? 'Sube una imagen y genera tu Reel/TikTok' : `Video para Reel/TikTok · ${durationLabel}`}
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="text-center p-6">
            <svg className="w-8 h-8 animate-spin text-primary mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-xs text-gray-500 dark:text-slate-400">{progressLabel()}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              {'Generación encadenada · ~30-90s por segmento'}
            </p>
            {clips > 1 && (
              <div className="flex gap-1 justify-center mt-2">
                {Array.from({ length: clips }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i < extendStep ? 'w-4 bg-primary' : i === extendStep ? 'w-4 bg-primary/50 animate-pulse' : 'w-2 bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {(status === 'done' || (status === 'extending' && videoUrl)) && videoUrl && (
          <video key={videoUrl} src={videoUrl} controls className="w-full h-full object-contain" />
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
          Costo: <span className="font-semibold text-gray-700 dark:text-gray-200">{cost} cr.</span>
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
            onClick={canGenerate ? handleGenerate : undefined}
            disabled={isGenerating || !hasCredits || (mode === 'image' && !imageBase64)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              canGenerate
                ? 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isGenerating
              ? 'Generando…'
              : !hasCredits
                ? 'Sin créditos →'
                : mode === 'image' && !imageBase64
                  ? 'Sube una imagen'
                  : '🎬 Generar video'}
          </button>
        </div>
      </div>
    </div>
  )
}
