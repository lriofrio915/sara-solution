'use client'

import dynamic from 'next/dynamic'
import { useState, useRef, useCallback } from 'react'
import {
  Sparkles, Download, Film, Clock, Layers,
  AlertCircle, CheckCircle, Loader2, LayoutList, Play,
} from 'lucide-react'
import type { VideoParams } from '@/lib/remotion/types'

// Player dynamically loaded — no SSR (Remotion needs browser APIs)
const VideoStudioPlayer = dynamic(() => import('@/components/marketing/VideoStudioPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 text-gray-400 dark:text-slate-500 text-sm">
      Cargando player...
    </div>
  ),
})

interface GeneratedResult extends VideoParams {
  escenas?: { numero: number; inicio: number; fin: number; descripcion: string }[]
  notas?: string
}

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok / Reel', emoji: '📱', dims: '9:16' },
  { id: 'instagram', label: 'Instagram', emoji: '📸', dims: '1:1' },
  { id: 'youtube', label: 'YouTube', emoji: '▶️', dims: '16:9' },
  { id: 'presentacion', label: 'Presentación', emoji: '📊', dims: '16:9' },
]

const DURATIONS = ['15', '30', '60', '90']

const STYLES = [
  { id: 'dinamico', label: 'Dinámico', desc: 'Cortes rápidos' },
  { id: 'minimalista', label: 'Minimalista', desc: 'Limpio' },
  { id: 'profesional', label: 'Profesional', desc: 'Corporativo' },
  { id: 'educativo', label: 'Educativo', desc: 'Informativo' },
]

const TEMPLATE_LABELS: Record<string, string> = {
  talking_head: 'Talking Head',
  announcement: 'Anuncio',
  testimonial: 'Testimonio',
}

type Status = 'idle' | 'uploading' | 'uploaded' | 'generating' | 'done' | 'error'

function fmtSize(b: number) {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function VideoStudioPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [platform, setPlatform] = useState('tiktok')
  const [duration, setDuration] = useState('30')
  const [style, setStyle] = useState('profesional')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'storyboard'>('preview')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.match(/\.(mp4|mov|webm|avi|m4v)$/i) && !f.type.startsWith('video/')) {
      setError('Formato no soportado. Usa MP4, MOV, WebM o AVI.')
      return
    }
    if (f.size > 500 * 1024 * 1024) {
      setError('El video no puede superar 500 MB.')
      return
    }
    setFile(f)
    setFileUrl(null)
    setResult(null)
    setStatus('uploading')
    setError(null)

    try {
      // Step 1: get signed upload URL from server (tiny request, no body size issue)
      const urlRes = await fetch('/api/marketing/video-studio/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: f.name, contentType: f.type || 'video/mp4' }),
      })
      const urlData = await urlRes.json()
      if (!urlRes.ok) throw new Error(urlData.error ?? 'Error obteniendo URL de subida')

      // Step 2: upload directly to Supabase (bypasses Next.js/Vercel body limit)
      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': urlData.contentType },
        body: f,
      })
      if (!uploadRes.ok) {
        const errText = await uploadRes.text()
        throw new Error(`Error al subir: ${uploadRes.status} ${errText.slice(0, 120)}`)
      }

      setFileUrl(urlData.publicUrl)
      setStatus('uploaded')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir el video')
      setStatus('error')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  async function handleGenerate() {
    if (!description.trim()) return
    setStatus('generating')
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/marketing/video-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: fileUrl,
          platform,
          duration: parseInt(duration),
          style,
          description,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al generar')
      setResult(data)
      setStatus('done')
      setActiveTab('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar')
      setStatus('error')
    }
  }

  async function handleRender() {
    if (!result) return
    setRendering(true)
    setError(null)
    try {
      const res = await fetch('/api/marketing/video-studio/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: result.template, params: result }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al renderizar')
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `video-studio-${Date.now()}.mp4`
      a.click()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar MP4')
    } finally {
      setRendering(false)
    }
  }

  const canGenerate = (status === 'uploaded' || status === 'idle') && description.trim().length > 10
  const generating = status === 'generating'
  const hasResult = status === 'done' && !!result

  return (
    <div className="px-6 md:px-8 py-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── LEFT: Config ── */}
        <div className="space-y-4">

          {/* Upload */}
          <div
            className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 hover:border-primary/50 hover:bg-primary/5'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.avi,.m4v"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            {!file ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Film className="w-6 h-6 text-primary" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                  Sube tu video crudo
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  MP4 · MOV · WebM — máx 500 MB — o describe sin video
                </p>
              </div>
            ) : (
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {status === 'uploading'
                    ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    : status === 'uploaded'
                    ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                    : <Film className="w-5 h-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{fmtSize(file.size)} · {status === 'uploading' ? 'Subiendo...' : 'Listo'}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setFileUrl(null); setStatus('idle'); setResult(null) }}
                  className="text-xs text-gray-400 hover:text-rose-500 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                >
                  Quitar
                </button>
              </div>
            )}
          </div>

          {/* Platform */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
              Plataforma
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    platform === p.id
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-slate-300 hover:border-primary/40'
                  }`}>
                  <span>{p.emoji}</span>
                  <span className="flex-1 text-left text-xs">{p.label}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{p.dims}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration + Style */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1 block">
                <Clock className="w-3 h-3" /> Duración
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      duration === d
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-slate-300 hover:border-primary/50'
                    }`}>
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1 block">
                <Layers className="w-3 h-3" /> Estilo
              </label>
              <div className="flex flex-col gap-1">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      style === s.id
                        ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-slate-300 hover:border-primary/40'
                    }`}>
                    <span>{s.label}</span>
                    <span className="text-[10px] text-gray-400">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
              Describe tu video
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Ej: Quiero un reel anunciando mi consulta nutricional. Hablaré sobre los beneficios de comer bien. Quiero mi nombre 'Dra. María González, Nutricionista' en la pantalla y un CTA 'Agenda tu cita hoy'."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all ${
              canGenerate && !generating
                ? 'bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando con IA...</>
              : <><Sparkles className="w-4 h-4" /> Generar con IA</>}
          </button>
        </div>

        {/* ── RIGHT: Preview ── */}
        <div className="lg:sticky lg:top-6">
          {!hasResult && !generating && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Play className="w-7 h-7 text-gray-400 dark:text-slate-500" />
              </div>
              <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Preview en vivo</p>
              <p className="text-gray-400 dark:text-slate-500 text-xs text-center px-8">
                Describe tu video y haz clic en &ldquo;Generar con IA&rdquo; para ver el preview aquí
              </p>
            </div>
          )}

          {generating && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 flex flex-col items-center justify-center py-20 gap-4">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
              <div className="text-center">
                <p className="text-primary font-semibold text-sm">Generando con IA...</p>
                <p className="text-gray-500 text-xs mt-1">Analizando y preparando la composición</p>
              </div>
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          )}

          {hasResult && result && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">

              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {TEMPLATE_LABELS[result.template] ?? result.template}
                    </span>
                    <span className="text-xs text-gray-400">{result.platform} · {result.duration}s</span>
                  </div>
                </div>
                <button
                  onClick={handleRender}
                  disabled={rendering}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    rendering
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {rendering
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Renderizando...</>
                    : <><Download className="w-3 h-3" /> Exportar MP4</>}
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 dark:border-gray-700">
                {(['preview', 'storyboard'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${
                      activeTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'
                    }`}>
                    {tab === 'preview' ? <><Play className="w-3 h-3" /> Preview</> : <><LayoutList className="w-3 h-3" /> Storyboard</>}
                  </button>
                ))}
              </div>

              {/* Preview tab */}
              {activeTab === 'preview' && (
                <div className="p-6 flex justify-center bg-gray-50 dark:bg-gray-900/50">
                  <VideoStudioPlayer params={result} />
                </div>
              )}

              {/* Storyboard tab */}
              {activeTab === 'storyboard' && (
                <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                  {result.title && (
                    <div className="rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-primary mb-1">Título principal</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">&ldquo;{result.title}&rdquo;</p>
                      {result.subtitle && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{result.subtitle}</p>}
                    </div>
                  )}
                  {result.lowerThird && (
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Lower Third</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{result.lowerThird.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{result.lowerThird.role}</p>
                    </div>
                  )}
                  {result.cta && (
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">CTA · aparece a los {result.ctaAt}s</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">&ldquo;{result.cta}&rdquo;</p>
                    </div>
                  )}
                  {result.escenas?.map((e, i) => (
                    <div key={i} className="rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Escena {e.numero}</p>
                        <span className="text-[10px] font-mono text-gray-400">{e.inicio}s → {e.fin}s</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-slate-300">{e.descripcion}</p>
                    </div>
                  ))}
                  {result.notas && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">Notas de edición</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">{result.notas}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
