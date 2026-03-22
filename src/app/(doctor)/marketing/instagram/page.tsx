'use client'

import { useState } from 'react'

type ContentType = 'POST' | 'CAROUSEL' | 'REEL' | 'STORY'

interface GeneratedPost {
  id: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  suggestedTime?: string
  carouselSlides?: { title: string; body: string }[]
  reelScript?: string
}

const FORMATS: { value: ContentType; label: string; desc: string }[] = [
  { value: 'POST',      label: 'Post',     desc: '1080×1080' },
  { value: 'CAROUSEL',  label: 'Carrusel', desc: '2-10 slides' },
  { value: 'REEL',      label: 'Reel',     desc: '9:16 · 15-90s' },
  { value: 'STORY',     label: 'Story',    desc: '9:16 · 15s' },
]

const SUGGESTIONS = [
  'Consejos de prevención para la temporada de gripe',
  'Importancia de los chequeos médicos anuales',
  '5 señales de que debes visitar al médico',
  'Cómo mantener una presión arterial saludable',
  'Mitos y verdades sobre los medicamentos genéricos',
  'Cuándo ir a urgencias vs consulta normal',
]

function AIImage({ prompt, aspect }: { prompt: string; aspect: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 9999))
  const isSquare = aspect === '1/1'
  const w = isSquare ? 1080 : 607
  const h = isSquare ? 1080 : 1080
  const encoded = encodeURIComponent(`professional medical healthcare illustration, ${prompt}, clean modern style, no text, high quality`)
  const src = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&nologo=true&seed=${seed}`

  function retry() {
    setStatus('loading')
    setSeed(Math.floor(Math.random() * 9999))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Imagen generada</p>
      <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 max-w-[200px]" style={{ aspectRatio: aspect }}>
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2">
            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <button onClick={retry} className="text-[10px] px-2 py-0.5 rounded bg-pink-500 text-white">Reintentar</button>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={prompt} className={`w-full h-full object-cover transition-opacity ${status === 'ok' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setStatus('ok')} onError={() => setStatus('error')} />
      </div>
      <div className="flex gap-2">
        <button onClick={retry} className="text-xs text-gray-400 hover:text-pink-600">Nueva imagen</button>
        {status === 'ok' && (
          <a href={src} download="instagram-post.jpg" target="_blank" rel="noopener noreferrer"
            className="text-xs text-pink-600 hover:underline">Descargar</a>
        )}
      </div>
    </div>
  )
}

export default function InstagramPage() {
  const [format, setFormat] = useState<ContentType>('POST')
  const [topic, setTopic] = useState('')
  const [extra, setExtra] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [post, setPost] = useState<GeneratedPost | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editHashtags, setEditHashtags] = useState('')
  const [copied, setCopied] = useState(false)
  const [marked, setMarked] = useState(false)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setGenerating(true)
    setError(null)
    setPost(null)
    try {
      const res = await fetch('/api/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), contentType: format, targetPlatform: 'INSTAGRAM', extraInstructions: extra || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al generar')
      setPost({ ...data.generated, id: data.post.id })
      setEditContent(data.generated.content)
      setEditHashtags((data.generated.hashtags ?? []).join(' '))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy() {
    const tags = editHashtags.split(/\s+/).filter(Boolean).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')
    navigator.clipboard.writeText(`${editContent}\n\n${tags}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleMarkPublished() {
    if (!post) return
    await fetch(`/api/marketing/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PUBLISHED' }),
    })
    setMarked(true)
  }

  const imageAspect = format === 'STORY' || format === 'REEL' ? '9/16' : '1/1'

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Instagram</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Crea contenido optimizado para Instagram con IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Crear contenido</h3>

            {/* Formato */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Formato</label>
              <div className="grid grid-cols-4 gap-2">
                {FORMATS.map(f => (
                  <button key={f.value} type="button" onClick={() => setFormat(f.value)}
                    className={`p-2 rounded-xl border text-center transition-all ${format === f.value ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-pink-300'}`}>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{f.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{f.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tema */}
            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Tema del post</label>
                <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
                  placeholder="Ej: Importancia de los chequeos preventivos anuales"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>

              {/* Sugerencias */}
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.slice(0, 4).map(s => (
                  <button key={s} type="button" onClick={() => setTopic(s)}
                    className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-slate-300 hover:bg-pink-100 dark:hover:bg-pink-900/30 hover:text-pink-700 dark:hover:text-pink-400">
                    {s.slice(0, 35)}...
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Instrucciones adicionales <span className="font-normal text-gray-300">(opcional)</span></label>
                <input value={extra} onChange={e => setExtra(e.target.value)}
                  placeholder="Ej: incluir estadísticas, tono más formal..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">{error}</div>
              )}

              <button type="submit" disabled={generating || !topic.trim()}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando con IA...</>
                ) : (
                  'Generar contenido'
                )}
              </button>
            </form>
          </div>

          {/* Conectar cuenta */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Publicación automática</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Conecta Instagram para publicar directamente</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">Próximamente</span>
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div>
          {!post && !generating && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-center p-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Ingresa un tema y genera tu contenido</p>
            </div>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center h-64 border border-gray-200 dark:border-gray-700 rounded-2xl">
              <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-500">Generando contenido con IA...</p>
            </div>
          )}

          {post && (
            <div className="space-y-4">
              {/* Contenido editable */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Contenido generado</p>
                  {marked && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Publicado</span>}
                </div>

                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={9}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-pink-400" />

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Hashtags</label>
                  <input value={editHashtags} onChange={e => setEditHashtags(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-400" />
                  <p className="text-[10px] text-gray-400 mt-1">Instagram recomienda 5-15 hashtags relevantes</p>
                </div>

                {/* Carrusel slides */}
                {post.carouselSlides && post.carouselSlides.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Slides del carrusel</p>
                    {post.carouselSlides.map((slide, i) => (
                      <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{i + 1}. {slide.title}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{slide.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reel script */}
                {post.reelScript && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Guión del Reel</p>
                    <pre className="text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 whitespace-pre-wrap">{post.reelScript}</pre>
                  </div>
                )}

                {post.suggestedTime && (
                  <p className="text-xs text-gray-400">Mejor hora para publicar: <strong className="text-gray-700 dark:text-gray-300">{post.suggestedTime}</strong></p>
                )}

                <div className="flex gap-2">
                  <button onClick={handleCopy} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'}`}>
                    {copied ? 'Copiado!' : 'Copiar texto + hashtags'}
                  </button>
                  {!marked && (
                    <button onClick={handleMarkPublished} className="px-3 py-2 rounded-xl text-sm font-medium border border-green-300 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
                      Marcar publicado
                    </button>
                  )}
                </div>
              </div>

              {/* Imagen */}
              {post.imagePrompt && <AIImage prompt={post.imagePrompt} aspect={imageAspect} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
