'use client'

import { useState, useEffect } from 'react'
import AIImage from '../_ai-image'
import SchedulePostModal from '@/components/marketing/SchedulePostModal'

// ─── Icons ────────────────────────────────────────────────────────────────────

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'LINKEDIN'
type ContentType = 'POST' | 'CAROUSEL' | 'VIDEO'

interface GeneratedPost {
  id: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  suggestedTime?: string
  carouselSlides?: { title: string; body: string }[]
  reelScript?: string
}

interface PlatformResult {
  platform: Platform
  post: GeneratedPost | null
  error: string | null
  loading: boolean
  copied: boolean
  marked: boolean
  scheduledAt: string | null
  showSchedule: boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; color: string; accent: string }[] = [
  { id: 'INSTAGRAM', label: 'Instagram', color: 'text-pink-500', accent: 'bg-pink-500' },
  { id: 'FACEBOOK',  label: 'Facebook',  color: 'text-blue-500', accent: 'bg-blue-600' },
  { id: 'TIKTOK',    label: 'TikTok',    color: 'text-gray-900 dark:text-white', accent: 'bg-gray-900' },
  { id: 'LINKEDIN',  label: 'LinkedIn',  color: 'text-blue-700', accent: 'bg-[#0A66C2]' },
]

const FOCUS_OPTIONS = [
  { value: 'crear_comunidad',    label: 'Crear comunidad',     instruction: 'Fomenta la interacción y participación activa.' },
  { value: 'ganar_credibilidad', label: 'Ganar credibilidad',  instruction: 'Comparte datos, estadísticas y evidencia que posicionen tu expertise.' },
  { value: 'fidelizar',          label: 'Fidelizar pacientes', instruction: 'Contenido de seguimiento, cuidado y consejos personalizados para tus pacientes.' },
  { value: 'aumentar_alcance',   label: 'Aumentar alcance',    instruction: 'Contenido emocional y compartible para llegar a nuevos pacientes.' },
]

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  switch (platform) {
    case 'INSTAGRAM': return <InstagramIcon className={className} />
    case 'FACEBOOK':  return <FacebookIcon className={className} />
    case 'TIKTOK':    return <TikTokIcon className={className} />
    case 'LINKEDIN':  return <LinkedInIcon className={className} />
  }
}

function platformAccentColor(platform: Platform): 'pink' | 'blue' | 'gray' | 'indigo' {
  switch (platform) {
    case 'INSTAGRAM': return 'pink'
    case 'FACEBOOK':  return 'blue'
    case 'TIKTOK':    return 'gray'
    case 'LINKEDIN':  return 'indigo'
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SocialPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['INSTAGRAM', 'FACEBOOK'])
  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState<ContentType>('POST')
  const [focus, setFocus] = useState('')
  const [extra, setExtra] = useState('')
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<PlatformResult[]>([])
  const [activeTab, setActiveTab] = useState<Platform | null>(null)
  const [specialtyTopics, setSpecialtyTopics] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/marketing/specialty-topics?platform=instagram')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.topics?.length) setSpecialtyTopics(d.topics)
        if (d?.isAdmin) setIsAdmin(true)
      })
      .catch(() => {})
  }, [])

  function togglePlatform(p: Platform) {
    setSelectedPlatforms(prev =>
      prev.includes(p)
        ? prev.length > 1 ? prev.filter(x => x !== p) : prev
        : [...prev, p]
    )
  }

  async function handleGenerate() {
    if (!topic.trim() || selectedPlatforms.length === 0) return
    setGenerating(true)

    const focusOption = FOCUS_OPTIONS.find(f => f.value === focus)
    const extraInstructions = [
      focusOption?.instruction,
      extra.trim() || null,
    ].filter(Boolean).join(' ')

    // Init results with loading state
    const initResults: PlatformResult[] = selectedPlatforms.map(p => ({
      platform: p,
      post: null,
      error: null,
      loading: true,
      copied: false,
      marked: false,
      scheduledAt: null,
      showSchedule: false,
    }))
    setResults(initResults)
    setActiveTab(selectedPlatforms[0])

    // Generate for each platform in parallel
    const generated = await Promise.allSettled(
      selectedPlatforms.map(platform =>
        fetch('/api/marketing/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, contentType, targetPlatform: platform, extraInstructions }),
        }).then(r => r.ok ? r.json() : Promise.reject(new Error('Error al generar')))
      )
    )

    setResults(prev => prev.map((r, i) => {
      const result = generated[i]
      if (result.status === 'fulfilled') {
        return { ...r, loading: false, post: result.value.post }
      } else {
        return { ...r, loading: false, error: 'Error al generar contenido para esta red' }
      }
    }))

    setGenerating(false)
  }

  async function handleMarkPublished(platform: Platform) {
    const r = results.find(x => x.platform === platform)
    if (!r?.post) return
    await fetch(`/api/marketing/posts/${r.post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PUBLISHED' }),
    })
    setResults(prev => prev.map(x => x.platform === platform ? { ...x, marked: true } : x))
  }

  async function handleCopy(platform: Platform) {
    const r = results.find(x => x.platform === platform)
    if (!r?.post) return
    const text = [r.post.content, r.post.hashtags.map(h => `#${h}`).join(' ')].filter(Boolean).join('\n\n')
    await navigator.clipboard.writeText(text)
    setResults(prev => prev.map(x => x.platform === platform ? { ...x, copied: true } : x))
    setTimeout(() => setResults(prev => prev.map(x => x.platform === platform ? { ...x, copied: false } : x)), 2000)
  }

  const activeResult = results.find(r => r.platform === activeTab)

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Crear contenido para redes sociales</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Genera un post y publícalo en todas las redes que elijas de una sola vez
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-start">

        {/* ── Formulario ────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Selector de plataformas */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
              ¿En qué redes publicar?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map(p => {
                const selected = selectedPlatforms.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 text-gray-900 dark:text-white'
                        : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <PlatformIcon platform={p.id} className={`w-4 h-4 ${selected ? p.color : 'text-gray-300 dark:text-gray-500'}`} />
                    {p.label}
                    {selected && (
                      <span className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {selectedPlatforms.length === 0 && (
              <p className="text-xs text-red-500">Selecciona al menos una red social</p>
            )}
          </div>

          {/* Tema del post */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
            <label className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide block">
              Tema del post
            </label>
            {specialtyTopics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {specialtyTopics.slice(0, 6).map(t => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      topic === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-400 hover:border-primary/50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder={isAdmin ? 'Ej: Cómo Sara Medical ayuda a médicos a triplicar sus citas en 30 días' : 'Ej: Prevención de diabetes tipo 2, cuidado de la piel en verano...'}
              rows={3}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Tipo de contenido */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Tipo de contenido</p>
            <div className="flex gap-2">
              {(['POST', 'CAROUSEL', 'VIDEO'] as ContentType[]).map(ct => (
                <button
                  key={ct}
                  onClick={() => setContentType(ct)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border-2 transition-colors ${
                    contentType === ct
                      ? 'border-primary text-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {ct === 'POST' ? '📝 Post' : ct === 'CAROUSEL' ? '🎠 Carrusel' : '🎬 Video/Reel'}
                </button>
              ))}
            </div>
          </div>

          {/* Objetivo / Focus */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Objetivo del post</p>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFocus(prev => prev === f.value ? '' : f.value)}
                  className={`text-xs px-3 py-2 rounded-xl border-2 text-left transition-colors ${
                    focus === f.value
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary font-semibold'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-400 hover:border-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Instrucciones adicionales */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-2">
            <label className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide block">
              Instrucciones adicionales <span className="normal-case font-normal">(opcional)</span>
            </label>
            <textarea
              value={extra}
              onChange={e => setExtra(e.target.value)}
              placeholder="Ej: Tono más formal, incluir CTA para agendar cita, mencionar promoción de diciembre..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Botón generar */}
          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || selectedPlatforms.length === 0 || generating}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generando para {selectedPlatforms.length} red{selectedPlatforms.length > 1 ? 'es' : ''}…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Generar con IA para {selectedPlatforms.length} red{selectedPlatforms.length > 1 ? 'es' : ''}
              </>
            )}
          </button>
        </div>

        {/* ── Resultados ────────────────────────────────────────────── */}
        <div>
          {results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-center p-8">
              <div className="flex gap-2 mb-3">
                {PLATFORMS.map(p => (
                  <PlatformIcon key={p.id} platform={p.id} className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                ))}
              </div>
              <p className="text-gray-500 dark:text-slate-400 text-sm">
                Selecciona tus redes, escribe un tema y genera el contenido
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">

              {/* Tabs de plataformas */}
              <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
                {results.map(r => {
                  const pConfig = PLATFORMS.find(p => p.id === r.platform)!
                  const isActive = activeTab === r.platform
                  return (
                    <button
                      key={r.platform}
                      onClick={() => setActiveTab(r.platform)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      {r.loading ? (
                        <svg className="w-3.5 h-3.5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : r.error ? (
                        <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.293 10.293a1 1 0 011.414 0L12 10.586l.293-.293a1 1 0 011.414 1.414L13.414 12l.293.293a1 1 0 01-1.414 1.414L12 13.414l-.293.293a1 1 0 01-1.414-1.414L10.586 12l-.293-.293a1 1 0 010-1.414z" /></svg>
                      ) : (
                        <PlatformIcon platform={r.platform} className={`w-3.5 h-3.5 ${isActive ? pConfig.color : 'text-gray-400'}`} />
                      )}
                      {pConfig.label}
                      {r.marked && <span className="ml-1 w-2 h-2 rounded-full bg-green-400 inline-block" />}
                      {r.scheduledAt && !r.marked && <span className="ml-1 w-2 h-2 rounded-full bg-purple-400 inline-block" />}
                    </button>
                  )
                })}
              </div>

              {/* Contenido del tab activo */}
              <div className="p-4 space-y-4">
                {activeResult?.loading && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <svg className="w-8 h-8 animate-spin text-primary mb-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <p className="text-sm text-gray-400">Generando contenido para {PLATFORMS.find(p => p.id === activeTab)?.label}…</p>
                  </div>
                )}

                {activeResult?.error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" /></svg>
                    {activeResult.error}
                  </div>
                )}

                {activeResult?.post && !activeResult.loading && (
                  <>
                    {/* Contenido editable */}
                    <div>
                      <label className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide block mb-1">
                        Contenido del post
                      </label>
                      <textarea
                        defaultValue={activeResult.post.content}
                        rows={6}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>

                    {/* Hashtags */}
                    {activeResult.post.hashtags.length > 0 && (
                      <div>
                        <label className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide block mb-1">
                          Hashtags
                        </label>
                        <p className="text-sm text-primary dark:text-primary/80 font-medium">
                          {activeResult.post.hashtags.map(h => `#${h}`).join(' ')}
                        </p>
                      </div>
                    )}

                    {/* Carousel slides */}
                    {activeResult.post.carouselSlides && activeResult.post.carouselSlides.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Slides del carrusel</p>
                        <div className="space-y-2">
                          {activeResult.post.carouselSlides.map((s, i) => (
                            <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-0.5">Slide {i + 1}: {s.title}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">{s.body}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reel script */}
                    {activeResult.post.reelScript && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Guion del video</p>
                        <pre className="text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-gray-700 rounded-xl p-3 whitespace-pre-wrap leading-relaxed border border-gray-100 dark:border-gray-600">{activeResult.post.reelScript}</pre>
                      </div>
                    )}

                    {/* Hora sugerida */}
                    {activeResult.post.suggestedTime && (
                      <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/></svg>
                        Mejor hora para publicar: <span className="font-semibold text-gray-600 dark:text-gray-300">{activeResult.post.suggestedTime}</span>
                      </p>
                    )}

                    {/* Acciones */}
                    {activeResult.scheduledAt && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/50">
                        <svg className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">
                          Programado para {new Date(activeResult.scheduledAt).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleCopy(activeResult.platform)}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${activeResult.copied ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-primary/90'}`}
                      >
                        {activeResult.copied ? '✓ Copiado' : 'Copiar texto + hashtags'}
                      </button>
                      {!activeResult.marked && !activeResult.scheduledAt && (
                        <button
                          onClick={() => setResults(prev => prev.map(r => r.platform === activeResult.platform ? { ...r, showSchedule: true } : r))}
                          className="px-3 py-2 rounded-xl text-sm font-medium border border-purple-300 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Programar
                        </button>
                      )}
                      {!activeResult.marked && (
                        <button
                          onClick={() => handleMarkPublished(activeResult.platform)}
                          className="px-3 py-2 rounded-xl text-sm font-medium border border-green-300 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          {activeResult.marked ? '✓ Publicado' : 'Marcar publicado'}
                        </button>
                      )}
                    </div>

                    {activeResult.showSchedule && activeResult.post && (
                      <SchedulePostModal
                        postId={activeResult.post.id}
                        accentColor={platformAccentColor(activeResult.platform)}
                        onScheduled={(at) => setResults(prev => prev.map(r => r.platform === activeResult.platform ? { ...r, scheduledAt: at, showSchedule: false } : r))}
                        onClose={() => setResults(prev => prev.map(r => r.platform === activeResult.platform ? { ...r, showSchedule: false } : r))}
                      />
                    )}

                    {/* Imagen IA */}
                    {activeResult.post.imagePrompt && (
                      <AIImage
                        prompt={activeResult.post.imagePrompt}
                        aspect="1200/630"
                        accentColor={activeResult.platform === 'INSTAGRAM' ? 'pink' : activeResult.platform === 'TIKTOK' ? 'gray' : 'blue'}
                        downloadName={`${activeResult.platform.toLowerCase()}-post.jpg`}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
