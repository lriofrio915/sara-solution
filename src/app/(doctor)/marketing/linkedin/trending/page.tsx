'use client'

import { useState, useEffect, useCallback } from 'react'

interface TrendingTopic {
  id: string
  title: string
  summary: string | null
  source: string
  category: string
  relevance: number
  fetchedAt: string
  sourceUrl: string | null
}

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

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  saas_medico:      { label: 'SaaS Médico',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  salud_digital:    { label: 'Salud Digital',      color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  medicina_general: { label: 'Medicina General',   color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  tecnologia:       { label: 'Tecnología',         color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

function LinkedInImagePreview({ prompt }: { prompt: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const encoded = encodeURIComponent(
    `professional business linkedin post image, ${prompt}, no text overlay, clean modern style, high quality`
  )
  const src = `https://image.pollinations.ai/prompt/${encoded}?width=1200&height=627&nologo=true&seed=99`

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Imagen LinkedIn (1200x627)</p>
      <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700" style={{ aspectRatio: '1200/627' }}>
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('error')}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-400 italic truncate flex-1">{prompt}</p>
        <a
          href={src}
          download="linkedin-post.jpg"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
        >
          Descargar
        </a>
      </div>
    </div>
  )
}

export default function LinkedInTrendingPage() {
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Generacion
  const [generating, setGenerating] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<'B2B' | 'B2C'>('B2B')
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null)
  const [savedPost, setSavedPost] = useState<SavedPost | null>(null)
  const [activeTopic, setActiveTopic] = useState<TrendingTopic | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Editor
  const [editContent, setEditContent] = useState('')
  const [editHashtags, setEditHashtags] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [markingPublished, setMarkingPublished] = useState(false)

  // Topic manual
  const [showAddTopic, setShowAddTopic] = useState(false)
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [newTopicCategory, setNewTopicCategory] = useState('medicina_general')
  const [addingTopic, setAddingTopic] = useState(false)

  const fetchTopics = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setFetchError(null)
    try {
      const url = '/api/marketing/linkedin/trending' + (refresh ? '?refresh=1' : '')
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) {
        setFetchError(data.error ?? 'Error al cargar tendencias')
        return
      }
      setTopics(data.topics ?? [])
    } catch {
      setFetchError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchTopics() }, [fetchTopics])

  const handleGenerate = async (topic: TrendingTopic) => {
    setGenerating(topic.id)
    setGeneratedPost(null)
    setSavedPost(null)
    setActiveTopic(topic)
    setGenerateError(null)
    try {
      const res = await fetch('/api/marketing/linkedin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.title,
          strategy,
          trendContext: topic.summary ?? undefined,
          trendingTopicId: topic.id,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.generated) {
        setGenerateError(data.error ?? 'Error al generar el post')
        return
      }
      setGeneratedPost(data.generated)
      setSavedPost(data.post)
      setEditContent(data.generated.content)
      setEditHashtags((data.generated.hashtags ?? []).join(' '))
    } catch {
      setGenerateError('Error de conexión al generar el post')
    } finally {
      setGenerating(null)
    }
  }

  const handleSaveEdits = async () => {
    if (!savedPost) return
    setSaving(true)
    try {
      const hashtagsArr = editHashtags
        .split(/[\s,]+/)
        .map((h) => h.trim().replace(/^#/, ''))
        .filter(Boolean)
        .map((h) => `#${h}`)

      await fetch('/api/marketing/linkedin/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: savedPost.id, content: editContent, hashtags: hashtagsArr }),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCopyAll = () => {
    const hashtagsStr = editHashtags
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter(Boolean)
      .map((h) => (h.startsWith('#') ? h : `#${h}`))
      .join(' ')
    navigator.clipboard.writeText(`${editContent}\n\n${hashtagsStr}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMarkPublished = async () => {
    if (!savedPost) return
    setMarkingPublished(true)
    try {
      await fetch('/api/marketing/linkedin/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: savedPost.id, status: 'PUBLISHED' }),
      })
      setSavedPost((p) => p ? { ...p, status: 'PUBLISHED' } : p)
    } finally {
      setMarkingPublished(false)
    }
  }

  const handleAddTopic = async () => {
    if (!newTopicTitle.trim()) return
    setAddingTopic(true)
    try {
      const res = await fetch('/api/marketing/linkedin/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTopicTitle.trim(), category: newTopicCategory }),
      })
      const data = await res.json()
      if (data.topic) {
        setTopics((prev) => [data.topic, ...prev])
        setNewTopicTitle('')
        setShowAddTopic(false)
      }
    } finally {
      setAddingTopic(false)
    }
  }

  const filtered = filterCategory === 'all'
    ? topics
    : topics.filter((t) => t.category === filterCategory)

  const categories = ['all', ...Array.from(new Set(topics.map((t) => t.category)))]

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LinkedInIcon className="w-6 h-6 text-blue-600" />
            Temas del Momento
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-300 mt-0.5">
            Genera posts LinkedIn desde tendencias actuales en salud y tecnología
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddTopic(!showAddTopic)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            + Tema propio
          </button>
          <button
            onClick={() => fetchTopics(true)}
            disabled={refreshing}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 flex items-center gap-2"
          >
            {refreshing ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Buscando...</>
            ) : (
              'Actualizar tendencias'
            )}
          </button>
        </div>
      </div>

      {/* Error de fetch */}
      {fetchError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
          {fetchError}
        </div>
      )}

      {/* Agregar tema manual */}
      {showAddTopic && (
        <div className="mb-6 p-4 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">Agregar tema propio</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="Ej: Beneficios de la telemedicina en consultorios pequeños"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <select
              value={newTopicCategory}
              onChange={(e) => setNewTopicCategory(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button
              onClick={handleAddTopic}
              disabled={addingTopic || !newTopicTitle.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            >
              {addingTopic ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {/* Estrategia selector */}
      <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Estrategia de contenido
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setStrategy('B2B')}
            className={`flex-1 min-w-[200px] p-3 rounded-xl border-2 text-left transition-all ${
              strategy === 'B2B'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
            }`}
          >
            <p className="font-semibold text-sm text-gray-900 dark:text-white">B2B — Admin Sara Medical</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Atraer médicos interesados en el software. Tono: innovador, ROI, eficiencia.
            </p>
          </button>
          <button
            onClick={() => setStrategy('B2C')}
            className={`flex-1 min-w-[200px] p-3 rounded-xl border-2 text-left transition-all ${
              strategy === 'B2C'
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-teal-300'
            }`}
          >
            <p className="font-semibold text-sm text-gray-900 dark:text-white">B2C — Médico buscando pacientes</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Posicionar al médico como experto. Tono: educativo, empático, confianza.
            </p>
          </button>
        </div>
      </div>

      {/* Filtro por categoría */}
      {topics.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat === 'all' ? 'Todos' : CATEGORY_LABELS[cat]?.label ?? cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid de tendencias + panel de resultado */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Topics */}
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Buscando tendencias actuales...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <LinkedInIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-slate-400 font-medium">No hay tendencias disponibles</p>
              <p className="text-sm text-gray-400 mt-1">Haz clic en &quot;Actualizar tendencias&quot; para buscar temas</p>
              <button
                onClick={() => fetchTopics(true)}
                disabled={refreshing}
                className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {refreshing ? 'Buscando...' : 'Buscar tendencias ahora'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((topic) => {
                const cat = CATEGORY_LABELS[topic.category]
                const isGenerating = generating === topic.id
                const isActive = activeTopic?.id === topic.id
                return (
                  <div
                    key={topic.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat?.color ?? 'bg-gray-100 text-gray-600'}`}>
                            {cat?.label ?? topic.category}
                          </span>
                          <span className="text-xs text-gray-400">
                            {Math.round(topic.relevance * 100)}% relevancia
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm leading-snug">
                          {topic.title}
                        </p>
                        {topic.summary && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {topic.summary}
                          </p>
                        )}
                        {topic.sourceUrl && (
                          <a
                            href={topic.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                          >
                            Ver fuente
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => handleGenerate(topic)}
                        disabled={!!generating}
                        className={`flex-shrink-0 px-3 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                          isActive
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200'
                        }`}
                      >
                        {isGenerating ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Generar'
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel de resultado generado */}
        <div>
          {!generatedPost && !generating && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center p-8">
              <LinkedInIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-slate-400 text-sm">
                Selecciona un tema y haz clic en <strong>Generar</strong> para crear tu post LinkedIn con IA
              </p>
            </div>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center h-64 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-500 dark:text-slate-400">Generando post con IA...</p>
            </div>
          )}

          {generateError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm mb-4">
              {generateError}
            </div>
          )}

          {generatedPost && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Post generado</p>
                {savedPost?.status === 'PUBLISHED' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                    Publicado
                  </span>
                )}
              </div>

              {/* Hook preview */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Primera línea (hook)</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{generatedPost.hook}</p>
              </div>

              {/* Editor de contenido */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                  Contenido del post
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{editContent.length} caracteres</p>
              </div>

              {/* Hashtags editor */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                  Hashtags (separados por espacio)
                </label>
                <input
                  value={editHashtags}
                  onChange={(e) => setEditHashtags(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Imagen */}
              {generatedPost.imagePrompt && (
                <LinkedInImagePreview prompt={generatedPost.imagePrompt} />
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Mejor hora</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{generatedPost.suggestedTime}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">CTA</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 line-clamp-2">{generatedPost.cta}</p>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleSaveEdits}
                  disabled={saving}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  onClick={handleCopyAll}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copied ? 'Copiado!' : 'Copiar texto + hashtags'}
                </button>
                {savedPost?.status !== 'PUBLISHED' && (
                  <button
                    onClick={handleMarkPublished}
                    disabled={markingPublished}
                    className="px-3 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 font-medium"
                  >
                    {markingPublished ? 'Marcando...' : 'Marcar publicado'}
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Copia el texto, pégalo en LinkedIn y adjunta la imagen descargada
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
