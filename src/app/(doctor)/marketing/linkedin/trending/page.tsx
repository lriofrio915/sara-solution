'use client'

import { useState, useEffect, useCallback } from 'react'
import AIImage from '../../_ai-image'

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
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

// Modal de confirmación estilizado
function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}


export default function LinkedInTrendingPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [roleLoaded, setRoleLoaded] = useState(false)

  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [refreshSuccess, setRefreshSuccess] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Modal de confirmación para eliminar
  const [confirmDelete, setConfirmDelete] = useState<TrendingTopic | null>(null)
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null)

  // Generacion
  const [generating, setGenerating] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<'B2B' | 'B2C'>('B2C')
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

  // Tema manual
  const [showAddTopic, setShowAddTopic] = useState(false)
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [newTopicCategory, setNewTopicCategory] = useState('medicina_general')
  const [addingTopic, setAddingTopic] = useState(false)

  // Specialty topics
  const [specialtyTopics, setSpecialtyTopics] = useState<string[]>([])
  const [specialtyLabel, setSpecialtyLabel] = useState<string>('')
  const [specialtyLoading, setSpecialtyLoading] = useState(true)
  const [refreshingSpecialty, setRefreshingSpecialty] = useState(false)
  const [generatingSpecialty, setGeneratingSpecialty] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/role')
      .then(r => r.json())
      .then(d => {
        setIsAdmin(!!d.isAdmin)
        if (!d.isAdmin) setStrategy('B2C')
      })
      .catch(() => {})
      .finally(() => setRoleLoaded(true))
  }, [])

  useEffect(() => {
    fetch('/api/marketing/specialty-topics')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.topics?.length) {
          setSpecialtyTopics(d.topics)
          setSpecialtyLabel(d.specialty ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setSpecialtyLoading(false))
  }, [])

  const fetchTopics = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setFetchError(null)
    setRefreshSuccess(null)
    try {
      const url = '/api/marketing/linkedin/trending' + (refresh ? '?refresh=1' : '')
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) {
        setFetchError(data.error ?? 'Error al cargar tendencias')
        return
      }
      const newTopics: TrendingTopic[] = data.topics ?? []
      setTopics(newTopics)
      if (refresh) {
        setRefreshSuccess(newTopics.length > 0
          ? `${newTopics.length} tendencias cargadas`
          : 'No se encontraron tendencias. Intenta de nuevo.')
        setTimeout(() => setRefreshSuccess(null), 4000)
      }
    } catch {
      setFetchError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchTopics() }, [fetchTopics])

  const handleDeleteTopic = async () => {
    if (!confirmDelete) return
    setDeletingTopicId(confirmDelete.id)
    try {
      await fetch(`/api/marketing/linkedin/trending?id=${confirmDelete.id}`, { method: 'DELETE' })
      setTopics(prev => prev.filter(t => t.id !== confirmDelete.id))
      if (activeTopic?.id === confirmDelete.id) {
        setActiveTopic(null)
        setGeneratedPost(null)
        setSavedPost(null)
      }
    } finally {
      setDeletingTopicId(null)
      setConfirmDelete(null)
    }
  }

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

  const handleRefreshSpecialty = async () => {
    setRefreshingSpecialty(true)
    setSpecialtyTopics([])
    setSpecialtyLoading(true)
    try {
      const res = await fetch(`/api/marketing/specialty-topics?_t=${Date.now()}`, { cache: 'no-store' })
      const d = res.ok ? await res.json() : null
      if (d?.topics?.length) {
        setSpecialtyTopics(d.topics)
        setSpecialtyLabel(d.specialty ?? '')
      }
    } catch { /* ignore */ } finally {
      setRefreshingSpecialty(false)
      setSpecialtyLoading(false)
    }
  }

  const handleGenerateSpecialty = async (topicText: string) => {
    const syntheticTopic: TrendingTopic = {
      id: `specialty_${Date.now()}`,
      title: topicText,
      summary: null,
      source: 'specialty',
      category: 'medicina_general',
      relevance: 8,
      fetchedAt: new Date().toISOString(),
      sourceUrl: null,
    }
    setGeneratingSpecialty(topicText)
    await handleGenerate(syntheticTopic)
    setGeneratingSpecialty(null)
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
    <>
      {/* Modal de confirmación de eliminación */}
      {confirmDelete && (
        <ConfirmModal
          title="Eliminar tema"
          message={`¿Eliminar "${confirmDelete.title.slice(0, 60)}${confirmDelete.title.length > 60 ? '...' : ''}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDeleteTopic}
          onCancel={() => setConfirmDelete(null)}
          loading={!!deletingTopicId}
        />
      )}

      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LinkedInIcon className="w-6 h-6 text-blue-600" />
              Temas del Momento
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-300 mt-0.5">
              Genera posts para LinkedIn desde tendencias actuales
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

        {fetchError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
            {fetchError}
          </div>
        )}

        {refreshSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 text-sm font-medium">
            {refreshSuccess}
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
                placeholder="Ej: Beneficios de la telemedicina en consultorios"
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

        {/* Estrategia — solo admin ve B2B */}
        {roleLoaded && (
          <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Enfoque del post
            </p>
            {isAdmin ? (
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setStrategy('B2B')}
                  className={`flex-1 min-w-[200px] p-3 rounded-xl border-2 text-left transition-all ${
                    strategy === 'B2B'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">Captar médicos</p>
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
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">Atraer pacientes</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Posicionarte como experto en tu área. Tono: educativo, empático, confianza.
                  </p>
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl border-2 border-teal-500 bg-teal-50 dark:bg-teal-900/30">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">Atraer pacientes</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Los posts se crean para posicionarte como experto y generar confianza con tus pacientes.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sugerencias de temas por especialidad */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              Sugerencias para{specialtyLabel ? ` ${specialtyLabel}` : ' tu especialidad'}
            </p>
            <span className="text-xs text-gray-400 dark:text-slate-500">— clic para generar post</span>
            <button
              onClick={handleRefreshSpecialty}
              disabled={refreshingSpecialty || specialtyLoading || !!generatingSpecialty}
              title="Refrescar sugerencias"
              className="ml-1 p-1 rounded-md text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-40 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshingSpecialty ? 'animate-spin' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          {specialtyLoading ? (
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 w-28 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />
              ))}
            </div>
          ) : specialtyTopics.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {specialtyTopics.map((topic, i) => {
                const isGeneratingThis = generatingSpecialty === topic
                return (
                  <button
                    key={i}
                    onClick={() => handleGenerateSpecialty(topic)}
                    disabled={!!generating || !!generatingSpecialty}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-1.5 disabled:opacity-50 ${
                      isGeneratingThis
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/40'
                    }`}
                  >
                    {isGeneratingThis && (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {topic}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        {/* Filtro por categoría (temas del momento) — solo admins */}
        {isAdmin && topics.length > 0 && (
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
        <div className={`grid grid-cols-1 gap-6 ${isAdmin ? 'xl:grid-cols-2' : ''}`}>
          {/* Topics — solo admins */}
          {isAdmin && <div>
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
                            {topic.source === 'manual' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                Propio
                              </span>
                            )}
                            {topic.source === 'curado' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                Curado
                              </span>
                            )}
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
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleGenerate(topic)}
                            disabled={!!generating}
                            className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                              isActive
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200'
                            }`}
                          >
                            {isGenerating ? (
                              <div className="w-4 h-4 border-2 border-white dark:border-gray-900 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              'Generar'
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(topic)}
                            title="Eliminar tema"
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>}

          {/* Panel de resultado */}
          <div>
            {!generatedPost && !generating && (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center p-8">
                <LinkedInIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-slate-400 text-sm">
                  Selecciona un tema y haz clic en <strong>Generar</strong> para crear tu post
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

                {/* Hook */}
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Primera línea (gancho)</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{generatedPost.hook}</p>
                </div>

                {/* Editor */}
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

                {/* Hashtags */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                    Hashtags
                  </label>
                  <input
                    value={editHashtags}
                    onChange={(e) => setEditHashtags(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {generatedPost.imagePrompt && (
                  <AIImage prompt={generatedPost.imagePrompt} aspect="1200/627" accentColor="blue" downloadName="linkedin-post.jpg" />
                )}

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
                      copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
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
    </>
  )
}
