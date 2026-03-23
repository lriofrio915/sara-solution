'use client'

import { useState, useEffect, useCallback } from 'react'
import AIImage from '../_ai-image'

interface SocialPost {
  id: string
  content: string
  hashtags: string[]
  status: string
  contentType: string
  targetPlatform: string
  topic: string | null
  imagePrompt: string | null
  suggestedTime: string | null
  aiGenerated: boolean
  createdAt: string
  scheduledAt: string | null
  publishedAt: string | null
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'APPROVED', label: 'Aprobados' },
  { value: 'PUBLISHED', label: 'Publicados' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los formatos' },
  { value: 'POST', label: 'Post' },
  { value: 'CAROUSEL', label: 'Carrusel' },
  { value: 'REEL', label: 'Reel / Video' },
  { value: 'STORY', label: 'Story' },
]

const PLATFORM_OPTIONS = [
  { value: '', label: 'Todas las redes' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'BOTH', label: 'Varias' },
]

const PLATFORM_ICONS: Record<string, string> = {
  INSTAGRAM: '📸',
  FACEBOOK: '👥',
  TIKTOK: '🎵',
  LINKEDIN: '💼',
  BOTH: '🌐',
}

const TYPE_ICONS: Record<string, string> = {
  POST: '📝', CAROUSEL: '🎠', REEL: '🎬', STORY: '⭕',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  APPROVED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  PUBLISHED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  SCHEDULED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  APPROVED: 'Aprobado',
  PUBLISHED: 'Publicado',
  SCHEDULED: 'Programado',
  REJECTED: 'Rechazado',
}

export default function LibraryPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkApproving, setIsBulkApproving] = useState(false)

  const allSelected = posts.length > 0 && posts.every(p => selectedIds.has(p.id))
  const someSelected = selectedIds.size > 0
  const selectedDraftIds = posts.filter(p => selectedIds.has(p.id) && p.status === 'DRAFT').map(p => p.id)

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(posts.map(p => p.id)))
    }
  }

  async function handleBulkDelete() {
    setConfirmBulkDelete(false)
    setIsBulkDeleting(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => fetch(`/api/marketing/posts/${id}`, { method: 'DELETE' }))
      )
      setPosts(prev => prev.filter(p => !selectedIds.has(p.id)))
      setTotal(prev => prev - selectedIds.size)
      if (expandedId && selectedIds.has(expandedId)) setExpandedId(null)
      setSelectedIds(new Set())
    } finally {
      setIsBulkDeleting(false)
    }
  }

  async function handleBulkApprove() {
    if (!selectedDraftIds.length) return
    setIsBulkApproving(true)
    try {
      await Promise.all(
        selectedDraftIds.map(id =>
          fetch(`/api/marketing/posts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APPROVED' }),
          })
        )
      )
      setPosts(prev => prev.map(p => selectedDraftIds.includes(p.id) ? { ...p, status: 'APPROVED' } : p))
      setSelectedIds(new Set())
    } finally {
      setIsBulkApproving(false)
    }
  }

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('contentType', typeFilter)
      if (platformFilter) params.set('targetPlatform', platformFilter)
      const res = await fetch(`/api/marketing/posts?${params}`)
      const data = await res.json()
      setPosts(data.posts ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, platformFilter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleApprove(id: string) {
    setApprovingId(id)
    try {
      await fetch(`/api/marketing/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'APPROVED' } : p))
    } finally {
      setApprovingId(null)
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(id)
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    setDeletingId(id)
    try {
      await fetch(`/api/marketing/posts/${id}`, { method: 'DELETE' })
      setPosts(prev => prev.filter(p => p.id !== id))
      setTotal(prev => prev - 1)
      if (expandedId === id) setExpandedId(null)
    } finally {
      setDeletingId(null)
    }
  }

  function handleCopy(post: SocialPost) {
    const text = [
      post.content,
      '',
      post.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' '),
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="p-6 md:p-8">

      {/* Modal eliminación masiva */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmBulkDelete(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white text-center mb-1">
              Eliminar {selectedIds.size} publicación{selectedIds.size !== 1 ? 'es' : ''}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBulkDelete(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleBulkDelete}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-medium text-white transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación individual */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white text-center mb-1">
              Eliminar publicación
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
              ¿Estás seguro? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-medium text-white transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Barra flotante de selección múltiple */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-gray-950 text-white rounded-2xl shadow-2xl border border-gray-700 whitespace-nowrap">
          <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-white transition-colors p-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-medium">
            {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          {!allSelected && (
            <button onClick={toggleSelectAll} className="text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-2">
              Seleccionar todas ({posts.length})
            </button>
          )}
          <div className="w-px h-5 bg-gray-700 mx-1" />
          {selectedDraftIds.length > 0 && (
            <button onClick={handleBulkApprove} disabled={bulkApproving}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-colors font-medium">
              {bulkApproving ? '...' : `✓ Aprobar (${selectedDraftIds.length})`}
            </button>
          )}
          <button onClick={() => setConfirmBulkDelete(true)} disabled={bulkDeleting}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors font-medium">
            {bulkDeleting ? '...' : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar
              </>
            )}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {/* Checkbox seleccionar todos */}
          {posts.length > 0 && !loading && (
            <button onClick={toggleSelectAll} className="flex items-center gap-2 group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                allSelected
                  ? 'bg-primary border-primary'
                  : someSelected
                    ? 'bg-primary/30 border-primary'
                    : 'border-gray-300 dark:border-gray-600 group-hover:border-primary'
              }`}>
                {allSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                {!allSelected && someSelected && <div className="w-2 h-0.5 bg-primary rounded" />}
              </div>
            </button>
          )}
          <p className="text-gray-500 dark:text-slate-300 text-sm">
            {total > 0 ? `${total} publicación${total !== 1 ? 'es' : ''}` : 'Sin publicaciones aún'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
            className="input py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="input py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="input py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <p className="text-5xl mb-4">📚</p>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sin publicaciones</h3>
          <p className="text-gray-500 dark:text-slate-300 mb-6 text-sm">
            {platformFilter || statusFilter || typeFilter
              ? 'No hay publicaciones con los filtros seleccionados.'
              : 'Genera contenido con IA en cualquiera de las redes para verlo aquí.'}
          </p>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map(post => {
            const isSelected = selectedIds.has(post.id)
            return (
            <div key={post.id} className={`rounded-2xl border overflow-hidden transition-colors ${
              isSelected
                ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 dark:border-primary/40'
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
            }`}>
              <div
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/10"
                onClick={() => setExpandedId(prev => prev === post.id ? null : post.id)}>
                {/* Checkbox de selección */}
                <div className="flex items-center gap-3 flex-shrink-0" onClick={e => toggleSelect(post.id, e)}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xl">{PLATFORM_ICONS[post.targetPlatform] ?? '📱'}</span>
                  <span className="text-lg">{TYPE_ICONS[post.contentType] ?? '📝'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {post.topic ?? post.content.slice(0, 80)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-400">
                    {post.targetPlatform} · {post.contentType} ·{' '}
                    {new Date(post.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {post.aiGenerated && ' · ✨ IA'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[post.status] ?? STATUS_COLORS.DRAFT}`}>
                    {STATUS_LABELS[post.status] ?? post.status}
                  </span>
                  {post.status === 'DRAFT' && (
                    <button onClick={() => handleApprove(post.id)} disabled={approvingId === post.id}
                      className="text-xs px-2.5 py-1 rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50">
                      {approvingId === post.id ? '...' : 'Aprobar'}
                    </button>
                  )}
                  <button onClick={() => handleCopy(post)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Copiar
                  </button>
                  <button onClick={() => handleDelete(post.id)} disabled={deletingId === post.id}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-500 disabled:opacity-50">
                    {deletingId === post.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              </div>

              {expandedId === post.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-3 bg-gray-50/50 dark:bg-gray-700/10">
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{post.content}</p>

                  {post.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {post.hashtags.map(h => (
                        <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          #{h.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  )}

                  {post.imagePrompt && (
                    <AIImage prompt={post.imagePrompt} aspect="1/1" accentColor="blue" downloadName="imagen-post.jpg" />
                  )}

                  {post.suggestedTime && (
                    <p className="text-xs text-gray-500 dark:text-slate-300">
                      Hora sugerida: <strong>{post.suggestedTime}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
