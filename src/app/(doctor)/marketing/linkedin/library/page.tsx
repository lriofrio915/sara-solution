'use client'

import { useState, useEffect, useCallback } from 'react'

interface LinkedInPost {
  id: string
  content: string
  hashtags: string[]
  imageUrl: string | null
  imagePrompt: string | null
  status: string
  topic: string | null
  suggestedTime: string | null
  linkedinStrategy: string | null
  createdAt: string
  publishedAt: string | null
  scheduledAt: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Borrador',   color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  APPROVED:  { label: 'Aprobado',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  SCHEDULED: { label: 'Programado', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  PUBLISHED: { label: 'Publicado',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  FAILED:    { label: 'Fallido',    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

export default function LinkedInLibraryPage() {
  const [posts, setPosts] = useState<LinkedInPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketing/linkedin/posts')
      const data = await res.json()
      setPosts(data.posts ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleCopy = (post: LinkedInPost) => {
    const hashStr = post.hashtags.join(' ')
    navigator.clipboard.writeText(`${post.content}\n\n${hashStr}`)
    setCopied(post.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este post?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/marketing/linkedin/posts?id=${id}`, { method: 'DELETE' })
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      await fetch('/api/marketing/linkedin/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, status } : p))
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = filterStatus === 'all' ? posts : posts.filter((p) => p.status === filterStatus)
  const counts = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Biblioteca LinkedIn</h2>
        <p className="text-sm text-gray-500 dark:text-slate-300 mt-0.5">
          Todos tus posts generados para LinkedIn
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts[key] ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{cfg.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['all', 'DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filterStatus === s
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s === 'all' ? `Todos (${posts.length})` : `${STATUS_CONFIG[s]?.label} (${counts[s] ?? 0})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">in</p>
          <p className="text-gray-500 dark:text-slate-400">No hay posts LinkedIn todavia</p>
          <a
            href="/marketing/linkedin/trending"
            className="mt-4 inline-block px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Generar primer post
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => {
            const st = STATUS_CONFIG[post.status]
            const isExpanded = expandedId === post.id
            const dateStr = new Date(post.createdAt).toLocaleDateString('es-EC', {
              day: '2-digit', month: 'short', year: 'numeric',
            })

            return (
              <div
                key={post.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
              >
                {/* Header row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => setExpandedId(isExpanded ? null : post.id)}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    in
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {post.topic ?? post.content.slice(0, 80)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st?.color}`}>
                        {st?.label}
                      </span>
                      {post.linkedinStrategy && (
                        <span className="text-xs text-gray-400">
                          {post.linkedinStrategy === 'B2B' ? 'B2B' : 'B2C'}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{dateStr}</span>
                      {post.suggestedTime && (
                        <span className="text-xs text-gray-400">{post.suggestedTime}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 space-y-4 pt-4">
                    <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 max-h-64 overflow-y-auto">
                      {post.content}
                    </div>

                    {post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.hashtags.map((h, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                            {h.startsWith('#') ? h : `#${h}`}
                          </span>
                        ))}
                      </div>
                    )}

                    {post.imagePrompt && (
                      <div className="text-xs text-gray-400 italic">
                        Imagen: {post.imagePrompt}
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleCopy(post)}
                        className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                          copied === post.id
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {copied === post.id ? 'Copiado!' : 'Copiar'}
                      </button>

                      {post.status === 'DRAFT' && (
                        <button
                          onClick={() => handleStatusChange(post.id, 'APPROVED')}
                          disabled={updatingId === post.id}
                          className="px-3 py-1.5 text-sm rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-60"
                        >
                          Aprobar
                        </button>
                      )}

                      {post.status !== 'PUBLISHED' && (
                        <button
                          onClick={() => handleStatusChange(post.id, 'PUBLISHED')}
                          disabled={updatingId === post.id}
                          className="px-3 py-1.5 text-sm rounded-lg border border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-60"
                        >
                          {updatingId === post.id ? '...' : 'Marcar publicado'}
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 ml-auto"
                      >
                        {deletingId === post.id ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
