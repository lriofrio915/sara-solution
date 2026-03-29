'use client'

import { useState, useEffect } from 'react'
import AIImage from '../_ai-image'

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

const FORMATS: { value: ContentType; label: string; desc: string }[] = [
  { value: 'POST',     label: 'Publicación', desc: '1200×630' },
  { value: 'CAROUSEL', label: 'Carrusel',    desc: '2-10 slides' },
  { value: 'VIDEO',    label: 'Video',       desc: 'Guión' },
]

const FOCUS_OPTIONS = [
  { value: 'crear_comunidad',    label: 'Crear comunidad',     description: 'Publicaciones que invitan a comentar y participar activamente. Construyes una comunidad alrededor de tu consulta y generas pertenencia.',        instruction: 'Fomenta la interacción, comentarios y participación activa de pacientes y seguidores.' },
  { value: 'ganar_credibilidad', label: 'Ganar credibilidad',  description: 'Posts con datos, estadísticas y evidencia médica. Refuerzan tu reputación como profesional serio y confiable en tu comunidad.',                  instruction: 'Comparte casos educativos, estadísticas y avances médicos que posicionen tu expertise.' },
  { value: 'fidelizar',          label: 'Fidelizar pacientes', description: 'Mantén el vínculo con tus pacientes actuales: recordatorios de cuidado, seguimiento post-consulta y consejos de salud personalizados.',             instruction: 'Publica recordatorios de cuidado, seguimiento post-consulta y consejos de salud personalizados.' },
  { value: 'aumentar_alcance',   label: 'Aumentar alcance',    description: 'Contenido emocional y compartible que llega a amigos y familiares de tus pacientes. Cada compartido es un nuevo paciente potencial.',             instruction: 'Crea contenido emocional y compartible que llegue a amigos y familiares de tus pacientes.' },
]

const ADMIN_FOCUS_OPTIONS = [
  { value: 'crear_comunidad',    label: 'Crear comunidad',     description: 'Posts que invitan a médicos a comentar, compartir y unirse. Construye una tribu de médicos emprendedores alrededor de Sara Medical.',            instruction: 'Fomenta la participación activa de médicos: invita a comentar experiencias, hacer preguntas y compartir. Tono de comunidad.' },
  { value: 'ganar_credibilidad', label: 'Ganar credibilidad',  description: 'Muestra resultados reales: tiempo ahorrado, citas duplicadas, testimonios de médicos. Posiciónate como referente en salud digital.',             instruction: 'Usa datos concretos, casos de éxito y resultados medibles de Sara Medical para construir credibilidad como fundador de software médico.' },
  { value: 'fidelizar_medicos',  label: 'Fidelizar médicos',   description: 'Contenido de valor para usuarios actuales: tips de uso, funciones nuevas e historias de éxito que refuerzan su decisión de usar el software.',  instruction: 'Crea contenido que aporte valor a médicos que ya usan Sara Medical: tips avanzados, nuevas funciones y casos de uso inspiradores.' },
  { value: 'aumentar_alcance',   label: 'Aumentar alcance',    description: 'Contenido viral sobre automatización médica que se comparte solo. Llega a médicos que aún no conocen Sara Medical a través de sus colegas.',      instruction: 'Crea contenido altamente compartible sobre transformación digital de consultorios para llegar a médicos que aún no conocen Sara Medical.' },
]

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}


export default function FacebookPage() {
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
  const [focus, setFocus] = useState('')
  const [specialtyTopics, setSpecialtyTopics] = useState<string[]>([])
  const [specialtyLoading, setSpecialtyLoading] = useState(true)
  const [refreshingSpecialty, setRefreshingSpecialty] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/marketing/specialty-topics?platform=facebook')
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
      const res = await fetch(`/api/marketing/specialty-topics?platform=facebook&_t=${Date.now()}`, { cache: 'no-store' })
      const d = res.ok ? await res.json() : null
      if (d?.topics?.length) setSpecialtyTopics(d.topics)
      if (d?.isAdmin) setIsAdmin(true)
    } catch { /* ignore */ } finally {
      setRefreshingSpecialty(false)
      setSpecialtyLoading(false)
    }
  }

  const apiContentType = format === 'VIDEO' ? 'REEL' : format

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
        body: JSON.stringify({
          topic: topic.trim(),
          contentType: apiContentType,
          targetPlatform: 'FACEBOOK',
          extraInstructions: [(isAdmin ? ADMIN_FOCUS_OPTIONS : FOCUS_OPTIONS).find(f => f.value === focus)?.instruction, extra].filter(Boolean).join(' ') || undefined,
        }),
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

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1877F2]">
          <FacebookIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Facebook</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Crea contenido optimizado para Facebook con IA</p>
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
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map(f => (
                  <button key={f.value} type="button" onClick={() => setFormat(f.value)}
                    className={`p-2 rounded-xl border text-center transition-all ${format === f.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'}`}>
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
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${focus === f.value ? 'bg-[#1877F2] text-white border-[#1877F2]' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-gray-600 hover:border-blue-300'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tema */}
            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Tema de la publicacion</label>
                <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
                  placeholder="Ej: Beneficios de una alimentacion saludable para el corazon"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {/* Sugerencias por especialidad */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sugerencias para tu especialidad</span>
                  <button type="button" onClick={handleRefreshSpecialty} disabled={refreshingSpecialty || specialtyLoading}
                    title="Nuevas sugerencias"
                    className="p-0.5 rounded text-gray-400 hover:text-blue-500 disabled:opacity-40 transition-colors">
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
                          className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                          {s.length > 35 ? s.slice(0, 35) + '…' : s}
                        </button>
                      ))
                  }
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Instrucciones adicionales <span className="font-normal text-gray-300">(opcional)</span></label>
                <input value={extra} onChange={e => setExtra(e.target.value)}
                  placeholder="Ej: incluir estadisticas, tono mas formal..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">{error}</div>
              )}

              <button type="submit" disabled={generating || !topic.trim()}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-[#1877F2] hover:bg-[#1565C0] text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando con IA...</>
                ) : (
                  'Generar contenido'
                )}
              </button>
            </form>
          </div>

          {/* Conectar cuenta */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center">
                <FacebookIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Publicacion automatica</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Conecta Facebook para publicar directamente</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">Proximamente</span>
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div>
          {!post && !generating && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-center p-8">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                <FacebookIcon className="w-6 h-6 text-[#1877F2]" />
              </div>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Ingresa un tema y genera tu contenido</p>
            </div>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center h-64 border border-gray-200 dark:border-gray-700 rounded-2xl">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-500">Generando contenido con IA...</p>
            </div>
          )}

          {post && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Contenido generado</p>
                  {marked && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Publicado</span>}
                </div>

                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={9}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Hashtags</label>
                  <input value={editHashtags} onChange={e => setEditHashtags(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-[10px] text-gray-400 mt-1">Facebook recomienda 3-5 hashtags relevantes</p>
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

                {/* Video script */}
                {post.reelScript && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Guion del video</p>
                    <pre className="text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 whitespace-pre-wrap">{post.reelScript}</pre>
                  </div>
                )}

                {post.suggestedTime && (
                  <p className="text-xs text-gray-400">Mejor hora para publicar: <strong className="text-gray-700 dark:text-gray-300">{post.suggestedTime}</strong></p>
                )}

                <div className="flex gap-2">
                  <button onClick={handleCopy} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-[#1877F2] hover:bg-[#1565C0] text-white'}`}>
                    {copied ? 'Copiado!' : 'Copiar texto + hashtags'}
                  </button>
                  {!marked && (
                    <button onClick={handleMarkPublished} className="px-3 py-2 rounded-xl text-sm font-medium border border-green-300 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
                      Marcar publicado
                    </button>
                  )}
                </div>
              </div>

              {post.imagePrompt && (
                <AIImage prompt={post.imagePrompt} aspect="1200/630" accentColor="blue" downloadName="facebook-post.jpg" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
