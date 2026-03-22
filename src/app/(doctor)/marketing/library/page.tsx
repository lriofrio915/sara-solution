'use client'

import { useState, useEffect, useCallback } from 'react'

function AIImage({ prompt }: { prompt: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [seed] = useState(() => Math.floor(Math.random() * 9999))
  const encoded = encodeURIComponent(
    `professional medical healthcare illustration, ${prompt}, clean modern style, no text, high quality`
  )
  const src = `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=1080&nologo=true&seed=${seed}`

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wide">Imagen generada por IA</p>
      <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 aspect-square max-w-xs">
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Generando imagen...</p>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-gray-400 text-center px-4">No se pudo generar</p>
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
      <div className="flex items-center gap-2">
        <p className="text-xs text-gray-400 italic truncate flex-1">{prompt}</p>
        <a
          href={src}
          download="imagen-post.jpg"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
        >
          Descargar
        </a>
      </div>
    </div>
  )
}

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
    if (!window.confirm('¿Eliminar este post? Esta acción no se puede deshacer.')) return
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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <p className="text-gray-500 dark:text-slate-300 text-sm">
          {total > 0 ? `${total} publicación${total !== 1 ? 'es' : ''}` : 'Sin publicaciones aún'}
        </p>
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
          {posts.map(post => (
            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/10"
                onClick={() => setExpandedId(prev => prev === post.id ? null : post.id)}>
                <div className="flex items-center gap-2 flex-shrink-0">
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
                    <AIImage prompt={post.imagePrompt} />
                  )}

                  {post.suggestedTime && (
                    <p className="text-xs text-gray-500 dark:text-slate-300">
                      Hora sugerida: <strong>{post.suggestedTime}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
