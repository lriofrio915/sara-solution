'use client'

import { useState, useEffect, useCallback } from 'react'

interface CalendarItem {
  id: string
  scheduledDate: string
  socialPost: {
    id: string
    content: string
    status: string
    contentType: string
    topic: string | null
    scheduledAt: string | null
  }
}

interface Calendar {
  id: string
  title: string
  startDate: string
  endDate: string
  frequency: string
  createdAt: string
  items: CalendarItem[]
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  APPROVED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  PUBLISHED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
}

const TYPE_ICONS: Record<string, string> = {
  POST: '📝', CAROUSEL: '🎠', REEL: '🎬', STORY: '⭕',
}

export default function PlanificadorPage() {
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [frequency, setFrequency] = useState('MONTHLY')
  const [postsCount, setPostsCount] = useState('12')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))

  const fetchCalendars = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketing/autopilot')
      const data = await res.json()
      setCalendars(data.calendars ?? [])
      if (data.calendars?.length > 0) setExpandedId(data.calendars[0].id)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCalendars() }, [fetchCalendars])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/marketing/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || null,
          frequency,
          postsCount: parseInt(postsCount),
          startDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al generar')
      await fetchCalendars()
      setExpandedId(data.calendar.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  async function handleApprovePost(postId: string, calendarId: string) {
    await fetch(`/api/marketing/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    })
    setCalendars(prev => prev.map(cal => {
      if (cal.id !== calendarId) return cal
      return {
        ...cal,
        items: cal.items.map(item =>
          item.socialPost.id === postId
            ? { ...item, socialPost: { ...item.socialPost, status: 'APPROVED' } }
            : item
        ),
      }
    }))
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      {/* Generate form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-4">Crear plan de contenido</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">{error}</div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Título del calendario</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Plan Enero 2025"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Frecuencia</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quincenal</option>
                <option value="MONTHLY">Mensual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">N° de publicaciones</label>
              <input type="number" min="4" max="30" value={postsCount} onChange={e => setPostsCount(e.target.value)}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha de inicio</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>

          <button type="submit" disabled={generating}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generando calendario con IA...
              </>
            ) : (
              <>Generar plan con IA</>
            )}
          </button>
          {generating && (
            <p className="text-xs text-gray-400 dark:text-slate-400">Esto puede tomar 15-30 segundos...</p>
          )}
        </form>
      </div>

      {/* Calendars list */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && calendars.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-500 dark:text-slate-300 text-sm">Crea tu primer plan de contenido arriba y la IA generará las publicaciones automáticamente.</p>
        </div>
      )}

      {calendars.map(cal => (
        <div key={cal.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Calendar header */}
          <button
            onClick={() => setExpandedId(prev => prev === cal.id ? null : cal.id)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{cal.title}</p>
                <p className="text-xs text-gray-400 dark:text-slate-400">
                  {new Date(cal.startDate).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })} —
                  {' '}{cal.items.length} publicaciones · {cal.frequency}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {cal.items.filter(i => i.socialPost.status === 'APPROVED').length}/{cal.items.length} aprobados
              </span>
              <span className="text-gray-400">{expandedId === cal.id ? '▲' : '▼'}</span>
            </div>
          </button>

          {/* Items */}
          {expandedId === cal.id && (
            <div className="border-t border-gray-100 dark:border-gray-700">
              {cal.items.map(item => (
                <div key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-6 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/10">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">{TYPE_ICONS[item.socialPost.contentType] ?? '📝'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {item.socialPost.topic ?? item.socialPost.content.slice(0, 60)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-400">
                        {new Date(item.scheduledDate).toLocaleDateString('es-EC', { weekday: 'short', day: '2-digit', month: 'short' })}
                        {' '}· {item.socialPost.contentType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.socialPost.status] ?? STATUS_COLORS.DRAFT}`}>
                      {item.socialPost.status === 'APPROVED' ? 'Aprobado' : item.socialPost.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                    </span>
                    {item.socialPost.status === 'DRAFT' && (
                      <button
                        onClick={() => handleApprovePost(item.socialPost.id, cal.id)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
                        Aprobar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
