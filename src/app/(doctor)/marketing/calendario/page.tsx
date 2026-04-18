'use client'

import { useState, useEffect, useCallback } from 'react'

interface SocialPost {
  id: string
  content: string
  hashtags: string[]
  status: string
  contentType: string
  targetPlatform: string
  topic: string | null
  scheduledAt: string | null
  publishedAt: string | null
  suggestedTime: string | null
  createdAt: string
  imageUrl: string | null
  imagePrompt: string | null
}

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-700/50',
  FACEBOOK:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/50',
  LINKEDIN:  'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700/50',
  TIKTOK:    'bg-gray-100 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600',
  BOTH:      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700/50',
}

const PLATFORM_ICONS: Record<string, string> = {
  INSTAGRAM: '📸', FACEBOOK: '👥', TIKTOK: '🎵', LINKEDIN: '💼', BOTH: '🌐',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', APPROVED: 'Aprobado', SCHEDULED: 'Programado',
  PUBLISHED: 'Publicado', FAILED: 'Fallido',
}
const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  APPROVED:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  SCHEDULED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  PUBLISHED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  FAILED:    'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
}

const VIEW_OPTIONS = [
  { value: 'list', label: 'Lista' },
  { value: 'week', label: 'Semana' },
]

function getWeekDays(baseDate: Date): Date[] {
  const d = new Date(baseDate)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    return x
  })
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function CalendarioPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'week'>('list')
  const [statusFilter, setStatusFilter] = useState('SCHEDULED')
  const [weekBase, setWeekBase] = useState(new Date())
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('09:00')
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Expand/edit state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [showImageInput, setShowImageInput] = useState(false)
  const [editImageInput, setEditImageInput] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generatingTaskId, setGeneratingTaskId] = useState<string | null>(null)
  const [generatingPostId, setGeneratingPostId] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/marketing/posts?${params}`)
      const data = await res.json()
      setPosts(data.posts ?? [])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  // Poll KIE task when generating
  useEffect(() => {
    if (!generatingTaskId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/marketing/kie/task?taskId=${generatingTaskId}&type=IMAGE`)
        const data = await res.json()
        if (data.state === 'success' && data.imageUrl) {
          setEditImageUrl(data.imageUrl)
          if (generatingPostId) {
            await fetch(`/api/marketing/posts/${generatingPostId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: data.imageUrl }),
            })
            setPosts(prev => prev.map(p =>
              p.id === generatingPostId ? { ...p, imageUrl: data.imageUrl } : p
            ))
          }
          setGeneratingTaskId(null)
          setGeneratingPostId(null)
          setGeneratingImage(false)
        } else if (data.state === 'fail') {
          setGeneratingTaskId(null)
          setGeneratingPostId(null)
          setGeneratingImage(false)
          alert('Error al generar imagen')
        }
      } catch {
        // keep polling
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [generatingTaskId, generatingPostId])

  function handleExpand(post: SocialPost) {
    if (expandedId === post.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(post.id)
    setEditContent(post.content)
    setEditImageUrl(post.imageUrl ?? null)
    setShowImageInput(false)
    setEditImageInput('')
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true)
    try {
      await fetch(`/api/marketing/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent, imageUrl: editImageUrl }),
      })
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, content: editContent, imageUrl: editImageUrl } : p
      ))
      setExpandedId(null)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleGenerateImage(post: SocialPost) {
    if (!post.imagePrompt) return
    setGeneratingImage(true)
    setGeneratingPostId(post.id)
    try {
      const res = await fetch('/api/marketing/kie/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: post.imagePrompt, socialPostId: post.id }),
      })
      const data = await res.json()
      if (data.taskId) {
        setGeneratingTaskId(data.taskId)
      } else {
        setGeneratingImage(false)
        setGeneratingPostId(null)
        alert(data.error ?? 'Error al generar imagen')
      }
    } catch {
      setGeneratingImage(false)
      setGeneratingPostId(null)
    }
  }

  async function handleReschedule(id: string) {
    if (!rescheduleDate) return
    setSaving(true)
    try {
      const scheduledAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString()
      await fetch(`/api/marketing/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt, status: 'SCHEDULED' }),
      })
      setPosts(prev => prev.map(p => p.id === id ? { ...p, scheduledAt, status: 'SCHEDULED' } : p))
      setReschedulingId(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(id: string) {
    setCancellingId(id)
    try {
      await fetch(`/api/marketing/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DRAFT', scheduledAt: null }),
      })
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'DRAFT', scheduledAt: null } : p))
    } finally {
      setCancellingId(null)
    }
  }

  function ExpandedPanel({ post }: { post: SocialPost }) {
    return (
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4 space-y-4">
        {/* Textarea contenido */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">
            Texto del post
          </label>
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={5}
            className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        {/* Imagen */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 block">
            Imagen
          </label>
          {editImageUrl ? (
            <img src={editImageUrl} alt="Post" className="w-48 h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-600 mb-2" />
          ) : (
            <div className="w-48 h-48 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center mb-2">
              <p className="text-xs text-gray-400">Sin imagen</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowImageInput(v => !v)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              {showImageInput ? 'Cancelar URL' : 'Cambiar URL'}
            </button>
            {post.imagePrompt && (
              <button
                onClick={() => handleGenerateImage(post)}
                disabled={generatingImage && generatingPostId === post.id}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 flex items-center gap-1.5">
                {generatingImage && generatingPostId === post.id
                  ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
                      Generando...
                    </>
                  )
                  : '✨ Regenerar IA (5 créditos)'}
              </button>
            )}
          </div>

          {showImageInput && (
            <div className="flex gap-2 mt-2">
              <input
                type="url"
                value={editImageInput}
                onChange={e => setEditImageInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                onClick={() => { setEditImageUrl(editImageInput); setShowImageInput(false); setEditImageInput('') }}
                disabled={!editImageInput.trim()}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-50">
                Aplicar
              </button>
            </div>
          )}
        </div>

        {/* Acciones guardar/cancelar */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSaveEdit(post.id)}
            disabled={savingEdit}
            className="text-sm px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
            {savingEdit ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button
            onClick={() => setExpandedId(null)}
            className="text-sm px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  const weekDays = getWeekDays(weekBase)

  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = a.scheduledAt ?? a.createdAt
    const dateB = b.scheduledAt ?? b.createdAt
    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Calendario de contenido</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Posts programados y publicados</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden flex-shrink-0">
            {VIEW_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setView(o.value as 'list' | 'week')}
                className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${view === o.value ? 'bg-primary text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="input py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">Todos</option>
            <option value="SCHEDULED">Programados</option>
            <option value="PUBLISHED">Publicados</option>
            <option value="FAILED">Fallidos</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty */}
      {!loading && posts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <p className="text-5xl mb-4">📅</p>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sin publicaciones</h3>
          <p className="text-sm text-gray-500 dark:text-slate-300">
            {statusFilter === 'SCHEDULED'
              ? 'No hay posts programados. Genera contenido y usa el botón "Programar".'
              : 'No hay publicaciones con este filtro.'}
          </p>
        </div>
      )}

      {/* ─── VISTA SEMANA ────────────────────────── */}
      {!loading && posts.length > 0 && view === 'week' && (
        <div className="space-y-3">
          {/* Navegación semana */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3">
            <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d) }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-slate-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {weekDays[0].toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })} –{' '}
              {weekDays[6].toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d) }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-slate-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Grid semana */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const dayPosts = sortedPosts.filter(p => {
                const d = p.scheduledAt ?? p.publishedAt
                return d && sameDay(new Date(d), day)
              })
              const isToday = sameDay(day, new Date())
              return (
                <div key={day.toISOString()}
                  className={`rounded-2xl border min-h-[120px] p-2 ${isToday ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                  <p className={`text-xs font-semibold mb-1.5 ${isToday ? 'text-primary' : 'text-gray-500 dark:text-slate-400'}`}>
                    {day.toLocaleDateString('es-EC', { weekday: 'short', day: '2-digit' })}
                  </p>
                  <div className="space-y-1">
                    {dayPosts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleExpand(p)}
                        className={`p-1.5 rounded-lg border text-[10px] leading-tight cursor-pointer transition-opacity hover:opacity-80 ${expandedId === p.id ? 'ring-2 ring-primary/50' : ''} ${PLATFORM_COLORS[p.targetPlatform] ?? PLATFORM_COLORS.BOTH}`}>
                        <p className="font-semibold line-clamp-1">{PLATFORM_ICONS[p.targetPlatform]} {p.topic ?? p.content.slice(0, 25)}</p>
                        {(p.scheduledAt ?? p.publishedAt) && (
                          <p className="opacity-70 mt-0.5">
                            {new Date(p.scheduledAt ?? p.publishedAt!).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Panel expandido debajo del grid (semana) */}
          {expandedId && (() => {
            const sel = sortedPosts.find(p => p.id === expandedId)
            if (!sel) return null
            return (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{PLATFORM_ICONS[sel.targetPlatform] ?? '📱'}</span>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{sel.topic ?? sel.content.slice(0, 60)}</p>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sel.status] ?? STATUS_COLORS.DRAFT}`}>
                    {STATUS_LABELS[sel.status] ?? sel.status}
                  </span>
                </div>
                <ExpandedPanel post={sel} />
              </div>
            )
          })()}
        </div>
      )}

      {/* ─── VISTA LISTA ─────────────────────────── */}
      {!loading && posts.length > 0 && view === 'list' && (
        <div className="space-y-3">
          {sortedPosts.map(post => (
            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              {/* Fila principal — clic para expandir */}
              <div
                onClick={() => handleExpand(post)}
                className="flex flex-col sm:flex-row sm:items-start gap-3 cursor-pointer select-none">
                {/* Fecha */}
                {(post.scheduledAt ?? post.publishedAt) && (
                  <div className="flex-shrink-0 w-14 text-center">
                    <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                      {new Date(post.scheduledAt ?? post.publishedAt!).getDate()}
                    </p>
                    <p className="text-xs text-gray-400 uppercase">
                      {new Date(post.scheduledAt ?? post.publishedAt!).toLocaleDateString('es-EC', { month: 'short' })}
                    </p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      {new Date(post.scheduledAt ?? post.publishedAt!).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm">{PLATFORM_ICONS[post.targetPlatform] ?? '📱'}</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                      {post.topic ?? post.content.slice(0, 80)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[post.status] ?? STATUS_COLORS.DRAFT}`}>
                      {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{post.content.slice(0, 120)}</p>
                </div>

                {/* Chevron expand */}
                <div className="flex-shrink-0 self-center">
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === post.id ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Acciones Reagendar/Cancelar (solo SCHEDULED) */}
              {post.status === 'SCHEDULED' && expandedId !== post.id && (
                <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  {reschedulingId === post.id ? (
                    <div className="flex items-center gap-2">
                      <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-400" />
                      <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-400" />
                      <button onClick={() => handleReschedule(post.id)} disabled={saving || !rescheduleDate}
                        className="text-xs px-2.5 py-1 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                        {saving ? '...' : 'Guardar'}
                      </button>
                      <button onClick={() => setReschedulingId(null)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setReschedulingId(post.id); setRescheduleDate(post.scheduledAt ? new Date(post.scheduledAt).toISOString().split('T')[0] : ''); setRescheduleTime(post.scheduledAt ? new Date(post.scheduledAt).toTimeString().slice(0, 5) : '09:00') }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                        Reagendar
                      </button>
                      <button onClick={() => handleCancel(post.id)} disabled={cancellingId === post.id}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:border-red-400 hover:text-red-500 disabled:opacity-50">
                        {cancellingId === post.id ? '...' : 'Cancelar'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Panel expandido inline */}
              {expandedId === post.id && <ExpandedPanel post={post} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
