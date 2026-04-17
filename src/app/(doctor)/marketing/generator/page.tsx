'use client'

import { useState } from 'react'

function AIImage({ prompt, postId }: { prompt: string; postId: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const encoded = encodeURIComponent(
    `professional medical healthcare illustration, ${prompt}, clean modern style, no text, high quality`
  )
  const src = `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=1080&nologo=true&seed=42`

  function handleLoad() {
    setStatus('ok')
    fetch(`/api/marketing/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: src }),
    }).catch(() => {})
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wide">Imagen generada por IA</p>
      <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 aspect-square">
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Generando imagen...</p>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-gray-400 text-center px-4">No se pudo generar la imagen</p>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={prompt}
          className={`w-full h-full object-cover transition-opacity ${status === 'ok' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleLoad}
          onError={() => setStatus('error')}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-400 dark:text-slate-400 italic truncate flex-1">{prompt}</p>
        <a
          href={src}
          download="imagen-post.jpg"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
        >
          ⬇ Descargar
        </a>
      </div>
    </div>
  )
}

type ContentType = 'POST' | 'CAROUSEL' | 'REEL' | 'STORY'
type Platform = 'INSTAGRAM' | 'FACEBOOK' | 'BOTH'

interface GeneratedPost {
  id: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  suggestedTime?: string
  carouselSlides?: { title: string; body: string }[]
  reelScript?: string
  contentType: ContentType
  status: string
}

const CONTENT_TYPES: { value: ContentType; label: string; icon: string }[] = [
  { value: 'POST', label: 'Post', icon: '📝' },
  { value: 'CAROUSEL', label: 'Carrusel', icon: '🎠' },
  { value: 'REEL', label: 'Reel', icon: '🎬' },
  { value: 'STORY', label: 'Story', icon: '⭕' },
]

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'BOTH', label: 'Ambos' },
]

const TOPIC_SUGGESTIONS = [
  'Prevención de enfermedades crónicas',
  'Importancia del chequeo médico anual',
  'Consejos de nutrición saludable',
  'Manejo del estrés y salud mental',
  'Vacunación y sus beneficios',
  'Señales de alarma que no debes ignorar',
  'Cómo prepararse para una consulta médica',
  'Mitos y verdades sobre medicamentos',
]

export default function GeneratorPage() {
  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState<ContentType>('POST')
  const [platform, setPlatform] = useState<Platform>('INSTAGRAM')
  const [goal, setGoal] = useState('')
  const [extraInstructions, setExtraInstructions] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedPost | null>(null)
  const [copied, setCopied] = useState(false)
  const [savingStatus, setSavingStatus] = useState<string | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) { setError('Ingresa un tema'); return }
    setGenerating(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, goal, contentType, targetPlatform: platform, extraInstructions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al generar')
      setResult({ ...data.generated, ...data.post, id: data.post.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  async function handleApprove() {
    if (!result) return
    setSavingStatus('Aprobando...')
    try {
      await fetch(`/api/marketing/posts/${result.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      setResult(prev => prev ? { ...prev, status: 'APPROVED' } : null)
    } finally {
      setSavingStatus(null)
    }
  }

  function handleCopy() {
    if (!result) return
    const text = [
      result.content,
      '',
      result.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' '),
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Configuración del contenido</h2>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de contenido</label>
              <div className="grid grid-cols-4 gap-2">
                {CONTENT_TYPES.map(ct => (
                  <button key={ct.value} type="button" onClick={() => setContentType(ct.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                      contentType === ct.value
                        ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-300 hover:border-primary/50'
                    }`}>
                    <span className="text-lg">{ct.icon}</span>
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Plataforma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plataforma</label>
              <div className="flex gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.value} type="button" onClick={() => setPlatform(p.value)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      platform === p.value
                        ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-300 hover:border-primary/50'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tema */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tema del contenido</label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="Ej: Prevención de diabetes tipo 2"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-2" />
              <div className="flex flex-wrap gap-1.5">
                {TOPIC_SUGGESTIONS.map(s => (
                  <button key={s} type="button" onClick={() => setTopic(s)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Objetivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Objetivo del post <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="text" value={goal} onChange={e => setGoal(e.target.value)}
                placeholder="Ej: conseguir más citas, educar sobre prevención, aumentar seguidores"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>

            {/* Extra */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Agrega más detalles para tus fotos/videos <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea value={extraInstructions} onChange={e => setExtraInstructions(e.target.value)} rows={3}
                placeholder="Ej: usa colores azules, incluye una persona sonriendo, muestra el consultorio, menciona que hay citas disponibles..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">{error}</div>
          )}

          <button onClick={handleGenerate} disabled={generating || !topic.trim()}
            className="w-full btn-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 py-3 text-base">
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generando con IA...
              </>
            ) : (
              <>✨ Generar contenido</>
            )}
          </button>
        </div>

        {/* Result */}
        <div>
          {!result && !generating && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center justify-center text-center h-64">
              <p className="text-4xl mb-3">✨</p>
              <p className="text-gray-500 dark:text-slate-300 text-sm">El contenido generado aparecerá aquí</p>
            </div>
          )}

          {generating && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center justify-center text-center h-64">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-slate-300 text-sm">La IA está creando tu contenido...</p>
            </div>
          )}

          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Status bar */}
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  result.status === 'APPROVED'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                }`}>
                  {result.status === 'APPROVED' ? 'Aprobado' : 'Borrador'}
                </span>
                <div className="flex gap-2">
                  <button onClick={handleCopy}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    {copied ? '✓ Copiado' : 'Copiar'}
                  </button>
                  {result.status !== 'APPROVED' && (
                    <button onClick={handleApprove} disabled={!!savingStatus}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                      {savingStatus ?? 'Aprobar'}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
                {/* Content */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wide mb-1.5">Contenido</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{result.content}</p>
                </div>

                {/* Hashtags */}
                {result.hashtags?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wide mb-1.5">Hashtags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.hashtags.map(h => (
                        <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          #{h.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Carousel slides */}
                {result.carouselSlides?.length && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wide mb-1.5">Diapositivas del carrusel</p>
                    <div className="space-y-2">
                      {result.carouselSlides.map((s, i) => (
                        <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{i + 1}. {s.title}</p>
                          <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">{s.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reel script */}
                {result.reelScript && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wide mb-1.5">Guión del Reel</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">{result.reelScript}</p>
                  </div>
                )}

                {/* AI Image */}
                {result.imagePrompt && (
                  <AIImage prompt={result.imagePrompt} postId={result.id} />
                )}

                {/* Suggested time */}
                {result.suggestedTime && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-300">
                    <span>🕐</span>
                    <span>Hora sugerida: <strong>{result.suggestedTime}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
