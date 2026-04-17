'use client'

import { useState, useEffect } from 'react'
import AIImage from '../_ai-image'
import SchedulePostModal from '@/components/marketing/SchedulePostModal'
import ConnectPublishCard from '@/components/marketing/ConnectPublishCard'

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

const FOCUS_OPTIONS = [
  { value: 'crecer_audiencia',   label: 'Crecer audiencia',    description: 'Publicaciones visuales y virales para llegar a personas que aún no te siguen. Maximiza el alcance y convierte extraños en seguidores.', instruction: 'Crea contenido viral y compartible para maximizar alcance y atraer nuevos seguidores.' },
  { value: 'ganar_credibilidad', label: 'Ganar credibilidad',  description: 'Contenido educativo que demuestra tu expertise médico. Te posiciona como referente de confianza ante pacientes y colegas.', instruction: 'Demuestra expertise médico con contenido educativo serio y basado en evidencia.' },
  { value: 'atraer_pacientes',   label: 'Atraer pacientes',    description: 'Posts que muestran tus servicios y responden dudas frecuentes. Cada publicación es una invitación directa a agendar una consulta.', instruction: 'Enfócate en síntomas comunes, soluciones prácticas e invita a agendar consulta.' },
  { value: 'fidelizar',          label: 'Fidelizar pacientes', description: 'Contenido de cuidado continuo para tus pacientes actuales: consejos de salud, recordatorios y acompañamiento en su proceso.', instruction: 'Crea contenido de seguimiento, consejos de cuidado y recordatorios de salud.' },
]

const ADMIN_FOCUS_OPTIONS = [
  { value: 'crear_comunidad',     label: 'Crear comunidad',        description: 'Contenido que invita a médicos a unirse, opinar y compartir. Construye una tribu de profesionales que confían en ti.', instruction: 'Crea contenido que genere conversación y comunidad entre médicos emprendedores. Invita a comentar y compartir.' },
  { value: 'ganar_credibilidad',  label: 'Ganar credibilidad',     description: 'Posts que muestran resultados reales, casos de éxito y el impacto medible de Sara Medical en consultorios.', instruction: 'Demuestra credibilidad como fundador mostrando resultados reales, métricas concretas y testimonios de médicos.' },
  { value: 'aumentar_alcance',    label: 'Aumentar alcance',       description: 'Contenido viral y compartible que llega a médicos que aún no te conocen. Convierte extraños en seguidores calificados.', instruction: 'Crea contenido altamente compartible sobre automatización médica y transformación digital de consultorios para maximizar el alcance.' },
  { value: 'fidelizar_medicos',   label: 'Fidelizar médicos',      description: 'Muestra el valor continuo del software: nuevas funciones, tips de uso y cómo sacarle más partido a Sara Medical.', instruction: 'Crea contenido de valor para usuarios actuales del software: tips, funciones, casos de uso avanzados e historias de éxito.' },
]


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
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduled, setScheduled] = useState(false)
  const [focus, setFocus] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [specialtyTopics, setSpecialtyTopics] = useState<string[]>([])
  const [specialtyLoading, setSpecialtyLoading] = useState(true)
  const [refreshingSpecialty, setRefreshingSpecialty] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/marketing/specialty-topics?platform=instagram')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.topics?.length) setSpecialtyTopics(d.topics)
        if (d?.isAdmin) setIsAdmin(true)
      })
      .catch(() => {})
      .finally(() => setSpecialtyLoading(false))
  }, [])

  async function handleRefreshSpecialty() {
    setRefreshingSpecialty(true)
    setSpecialtyTopics([])
    setSpecialtyLoading(true)
    try {
      const res = await fetch(`/api/marketing/specialty-topics?platform=instagram&_t=${Date.now()}`, { cache: 'no-store' })
      const d = res.ok ? await res.json() : null
      if (d?.topics?.length) setSpecialtyTopics(d.topics)
      if (d?.isAdmin) setIsAdmin(true)
    } catch { /* ignore */ } finally {
      setRefreshingSpecialty(false)
      setSpecialtyLoading(false)
    }
  }

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
        body: JSON.stringify({ topic: topic.trim(), contentType: format, targetPlatform: 'INSTAGRAM', extraInstructions: [(isAdmin ? ADMIN_FOCUS_OPTIONS : FOCUS_OPTIONS).find(f => f.value === focus)?.instruction, extra].filter(Boolean).join(' ') || undefined }),
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

  async function handleSchedule() {
    if (!post || !scheduleDate) return
    setScheduling(true)
    try {
      await fetch(`/api/marketing/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SCHEDULED', scheduledAt: new Date(scheduleDate).toISOString() }),
      })
      setScheduled(true)
    } finally {
      setScheduling(false)
    }
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

            {/* Enfoque */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Enfoque del post</label>
              <div className="flex flex-wrap gap-2">
                {(isAdmin ? ADMIN_FOCUS_OPTIONS : FOCUS_OPTIONS).map(f => (
                  <button key={f.value} type="button" onClick={() => setFocus(focus === f.value ? '' : f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${focus === f.value ? 'bg-pink-500 text-white border-pink-500' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-gray-600 hover:border-pink-300'}`}>
                    {f.label}
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

              {/* Sugerencias por especialidad */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sugerencias para tu especialidad</span>
                  <button type="button" onClick={handleRefreshSpecialty} disabled={refreshingSpecialty || specialtyLoading}
                    title="Nuevas sugerencias"
                    className="p-0.5 rounded text-gray-400 hover:text-pink-500 disabled:opacity-40 transition-colors">
                    <svg className={`w-3 h-3 ${refreshingSpecialty ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {specialtyLoading
                    ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 w-24 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />)
                    : specialtyTopics.map((s, i) => (
                        <button key={i} type="button" onClick={() => setTopic(s)}
                          className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-slate-300 hover:bg-pink-100 dark:hover:bg-pink-900/30 hover:text-pink-700 dark:hover:text-pink-400 transition-colors">
                          {s.length > 35 ? s.slice(0, 35) + '…' : s}
                        </button>
                      ))
                  }
                </div>
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

          <ConnectPublishCard
            platform="instagram"
            postId={post?.id ?? null}
            onPublished={() => setMarked(true)}
          />
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
                  {scheduledAt && !marked && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        Programado {new Date(scheduledAt).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <a href="/marketing/calendario" className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 hover:underline flex items-center gap-1">
                        Ver calendario
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </a>
                    </div>
                  )}
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

                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleCopy} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'}`}>
                    {copied ? 'Copiado!' : 'Copiar texto + hashtags'}
                  </button>
                  {!marked && !scheduledAt && (
                    <button onClick={() => setShowSchedule(true)}
                      className="px-3 py-2 rounded-xl text-sm font-medium border border-purple-300 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Programar
                    </button>
                  )}
                  {!marked && (
                    <button onClick={handleMarkPublished} className="px-3 py-2 rounded-xl text-sm font-medium border border-green-300 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
                      Marcar publicado
                    </button>
                  )}
                </div>

                {showSchedule && post && (
                  <SchedulePostModal
                    postId={post.id}
                    accentColor="pink"
                    onScheduled={(at) => { setScheduledAt(at); setShowSchedule(false) }}
                    onClose={() => setShowSchedule(false)}
                  />
                )}
              </div>

              {/* Imagen */}
              {post.imagePrompt && (
                <AIImage
                  prompt={post.imagePrompt}
                  aspect={imageAspect === '9/16' ? '9/16' : '1/1'}
                  accentColor="pink"
                  downloadName="instagram-post.jpg"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
