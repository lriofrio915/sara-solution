'use client'

import { useState, useEffect } from 'react'
import AIImage from '../../_ai-image'

interface GeneratedPost {
  hook: string
  content: string
  hashtags: string[]
  imagePrompt: string
  suggestedTime: string
  cta: string
}

interface SavedPost {
  id: string
  content: string
  hashtags: string[]
  imagePrompt: string | null
  suggestedTime: string | null
  status: string
}

const FOCUS_OPTIONS = [
  { value: 'posicionarme_experto', label: 'Posicionarme como experto',  instruction: 'Escribe desde la autoridad médica del doctor, demuestra expertise y posiciónalo como referente de confianza en su especialidad.' },
  { value: 'atraer_pacientes',     label: 'Atraer pacientes',           instruction: 'El post debe generar confianza y motivar al lector a agendar una consulta con el médico. Incluye un CTA claro al final.' },
  { value: 'ganar_visibilidad',    label: 'Ganar visibilidad',          instruction: 'Crea contenido educativo valioso y compartible para maximizar el alcance orgánico y atraer nuevos seguidores.' },
  { value: 'networking',           label: 'Networking profesional',     instruction: 'Tono de colega a colega, orientado a generar conexiones con otros profesionales de salud y referidos médicos.' },
]

const ADMIN_FOCUS_OPTIONS = [
  { value: 'thought_leadership',  label: 'Thought leadership',         instruction: 'Escribe como fundador visionario de Sara Medical. Comparte visión sobre el futuro de la salud digital y el impacto de la IA en consultorios médicos.' },
  { value: 'captar_medicos',      label: 'Captar médicos',             instruction: 'El post debe generar curiosidad y motivar a médicos con consultorio propio a querer conocer más sobre Sara Medical. Incluye CTA claro.' },
  { value: 'crear_comunidad',     label: 'Crear comunidad',            instruction: 'Crea contenido que invite a médicos a comentar, compartir experiencias y unirse a la conversación sobre modernización de consultorios.' },
  { value: 'casos_de_exito',      label: 'Casos de éxito',             instruction: 'Comparte resultados concretos y transformaciones reales de consultorios que usan Sara Medical. Usa números y métricas específicas.' },
]

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

export default function LinkedInTrendingPage() {
  const [topic, setTopic] = useState('')
  const [extra, setExtra] = useState('')
  const [focus, setFocus] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null)
  const [savedPost, setSavedPost] = useState<SavedPost | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editHashtags, setEditHashtags] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [markingPublished, setMarkingPublished] = useState(false)

  const [isAdmin, setIsAdmin] = useState(false)
  const [strategy, setStrategy] = useState<'B2B' | 'B2C'>('B2C')

  const [specialtyTopics, setSpecialtyTopics] = useState<string[]>([])
  const [specialtyLoading, setSpecialtyLoading] = useState(true)
  const [refreshingSpecialty, setRefreshingSpecialty] = useState(false)

  useEffect(() => {
    fetch('/api/marketing/specialty-topics?platform=linkedin')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.topics?.length) setSpecialtyTopics(d.topics)
        if (d?.isAdmin) {
          setIsAdmin(true)
          setStrategy('B2B')
        }
      })
      .catch(() => {})
      .finally(() => setSpecialtyLoading(false))
  }, [])

  async function handleRefreshSpecialty() {
    setRefreshingSpecialty(true)
    setSpecialtyTopics([])
    setSpecialtyLoading(true)
    try {
      const res = await fetch(`/api/marketing/specialty-topics?platform=linkedin&_t=${Date.now()}`, { cache: 'no-store' })
      const d = res.ok ? await res.json() : null
      if (d?.topics?.length) setSpecialtyTopics(d.topics)
      if (d?.isAdmin) { setIsAdmin(true); setStrategy('B2B') }
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
    setGeneratedPost(null)
    setSavedPost(null)
    try {
      const focusOptions = isAdmin ? ADMIN_FOCUS_OPTIONS : FOCUS_OPTIONS
      const res = await fetch('/api/marketing/linkedin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          strategy,
          extraInstructions: [focusOptions.find(f => f.value === focus)?.instruction, extra].filter(Boolean).join(' ') || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.generated) throw new Error(data.error ?? 'Error al generar')
      setGeneratedPost(data.generated)
      setSavedPost(data.post)
      setEditContent(data.generated.content)
      setEditHashtags((data.generated.hashtags ?? []).join(' '))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveEdits() {
    if (!savedPost) return
    setSaving(true)
    try {
      const hashtagsArr = editHashtags
        .split(/[\s,]+/)
        .map(h => h.trim().replace(/^#/, ''))
        .filter(Boolean)
        .map(h => `#${h}`)
      await fetch('/api/marketing/linkedin/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: savedPost.id, content: editContent, hashtags: hashtagsArr }),
      })
    } finally {
      setSaving(false)
    }
  }

  function handleCopyAll() {
    const hashtagsStr = editHashtags
      .split(/[\s,]+/)
      .map(h => h.trim())
      .filter(Boolean)
      .map(h => h.startsWith('#') ? h : `#${h}`)
      .join(' ')
    navigator.clipboard.writeText(`${editContent}\n\n${hashtagsStr}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleMarkPublished() {
    if (!savedPost) return
    setMarkingPublished(true)
    try {
      await fetch('/api/marketing/linkedin/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: savedPost.id, status: 'PUBLISHED' }),
      })
      setSavedPost(p => p ? { ...p, status: 'PUBLISHED' } : p)
    } finally {
      setMarkingPublished(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0A66C2]">
          <LinkedInIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">LinkedIn</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Crea contenido optimizado para LinkedIn con IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Formulario ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Crear contenido</h3>

            {/* Audiencia (solo admin) */}
            {isAdmin && (
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Audiencia objetivo</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStrategy('B2B')}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${strategy === 'B2B' ? 'bg-[#0A66C2]/10 border-[#0A66C2] text-[#0A66C2]' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-300 hover:border-blue-400'}`}>
                    Captar médicos
                  </button>
                  <button type="button" onClick={() => setStrategy('B2C')}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${strategy === 'B2C' ? 'bg-teal-50 border-teal-500 text-teal-600 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-300 hover:border-teal-400'}`}>
                    Atraer pacientes
                  </button>
                </div>
              </div>
            )}

            {/* Enfoque */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Enfoque del post</label>
              <div className="flex flex-wrap gap-2">
                {(isAdmin ? ADMIN_FOCUS_OPTIONS : FOCUS_OPTIONS).map(f => (
                  <button key={f.value} type="button" onClick={() => setFocus(focus === f.value ? '' : f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${focus === f.value ? 'bg-[#0A66C2] text-white border-[#0A66C2]' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-gray-600 hover:border-blue-400'}`}>
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
                  placeholder="Ej: Cómo la IA está transformando la gestión de consultorios médicos"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/40" />
              </div>

              {/* Sugerencias por especialidad */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sugerencias para tu especialidad</span>
                  <button type="button" onClick={handleRefreshSpecialty} disabled={refreshingSpecialty || specialtyLoading}
                    title="Nuevas sugerencias"
                    className="p-0.5 rounded text-gray-400 hover:text-[#0A66C2] disabled:opacity-40 transition-colors">
                    <svg className={`w-3 h-3 ${refreshingSpecialty ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {specialtyLoading
                    ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 w-28 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />)
                    : specialtyTopics.map((s, i) => (
                        <button key={i} type="button" onClick={() => setTopic(s)}
                          className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                          {s.length > 35 ? s.slice(0, 35) + '…' : s}
                        </button>
                      ))
                  }
                </div>
              </div>

              {/* Instrucciones adicionales */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
                  Instrucciones adicionales <span className="font-normal text-gray-300">(opcional)</span>
                </label>
                <input value={extra} onChange={e => setExtra(e.target.value)}
                  placeholder="Ej: incluir estadísticas, tono más formal, mencionar disponibilidad..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/40" />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">{error}</div>
              )}

              <button type="submit" disabled={generating || !topic.trim()}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-[#0A66C2] hover:bg-[#004182] text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando con IA...</>
                ) : (
                  'Generar contenido'
                )}
              </button>
            </form>
          </div>

          {/* Publicación automática */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
                <LinkedInIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Publicación automática</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Conecta LinkedIn para publicar directamente</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium flex-shrink-0">Próximamente</span>
            </div>
          </div>
        </div>

        {/* ── Resultado ──────────────────────────────────────────── */}
        <div>
          {!generatedPost && !generating && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-center p-8">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                <LinkedInIcon className="w-6 h-6 text-[#0A66C2]" />
              </div>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Ingresa un tema y genera tu contenido</p>
            </div>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center h-64 border border-gray-200 dark:border-gray-700 rounded-2xl">
              <div className="w-10 h-10 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-500 dark:text-slate-400">Generando contenido con IA...</p>
            </div>
          )}

          {generatedPost && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Contenido generado</p>
                  {savedPost?.status === 'PUBLISHED' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">Publicado</span>
                  )}
                </div>

                {/* Gancho */}
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50">
                  <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Primera línea (gancho)</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{generatedPost.hook}</p>
                </div>

                {/* Editor */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Contenido del post</label>
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={10}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/40" />
                  <p className="text-[10px] text-gray-400 mt-0.5 text-right">{editContent.length} caracteres</p>
                </div>

                {/* Hashtags */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Hashtags</label>
                  <input value={editHashtags} onChange={e => setEditHashtags(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/40" />
                  <p className="text-[10px] text-gray-400 mt-1">LinkedIn recomienda 3-5 hashtags relevantes</p>
                </div>

                {/* CTA + Hora */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Mejor hora</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{generatedPost.suggestedTime}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">CTA sugerido</p>
                    <p className="text-xs font-medium text-gray-900 dark:text-white mt-0.5 line-clamp-2">{generatedPost.cta}</p>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleSaveEdits} disabled={saving}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors">
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button onClick={handleCopyAll}
                    className={`flex-1 px-3 py-2 text-sm rounded-xl font-semibold transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-[#0A66C2] hover:bg-[#004182] text-white'}`}>
                    {copied ? 'Copiado!' : 'Copiar texto + hashtags'}
                  </button>
                  {savedPost?.status !== 'PUBLISHED' && (
                    <button onClick={handleMarkPublished} disabled={markingPublished}
                      className="px-3 py-2 text-sm rounded-xl bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 font-medium transition-colors">
                      {markingPublished ? 'Marcando...' : 'Marcar publicado'}
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Copia el texto, pégalo en LinkedIn y adjunta la imagen descargada
                </p>
              </div>

              {/* Imagen IA */}
              {generatedPost.imagePrompt && (
                <AIImage
                  prompt={generatedPost.imagePrompt}
                  aspect="1200/627"
                  accentColor="blue"
                  downloadName="linkedin-post.jpg"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
