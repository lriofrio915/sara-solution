'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import AIImage from '../_ai-image'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

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
    hashtags: string[]
    suggestedTime: string | null
    targetPlatform: string
    imagePrompt: string | null
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

const PLATFORM_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  INSTAGRAM: { label: 'Instagram', bg: 'bg-gradient-to-r from-pink-500 to-purple-500', text: 'text-white', icon: <InstagramIcon className="w-3 h-3" /> },
  FACEBOOK:  { label: 'Facebook',  bg: 'bg-blue-600',  text: 'text-white', icon: <FacebookIcon className="w-3 h-3" /> },
  TIKTOK:    { label: 'TikTok',    bg: 'bg-gray-900',  text: 'text-white', icon: <TikTokIcon className="w-3 h-3" /> },
  LINKEDIN:  { label: 'LinkedIn',  bg: 'bg-blue-700',  text: 'text-white', icon: <LinkedInIcon className="w-3 h-3" /> },
  BOTH:      { label: 'Varias',    bg: 'bg-gray-500',  text: 'text-white', icon: <span className="text-xs">🌐</span> },
}

const ALL_PLATFORMS = [
  { value: 'INSTAGRAM', label: 'Instagram', icon: <InstagramIcon className="w-4 h-4" /> },
  { value: 'FACEBOOK',  label: 'Facebook',  icon: <FacebookIcon  className="w-4 h-4" /> },
  { value: 'TIKTOK',    label: 'TikTok',    icon: <TikTokIcon    className="w-4 h-4" /> },
  { value: 'LINKEDIN',  label: 'LinkedIn',  icon: <LinkedInIcon  className="w-4 h-4" /> },
]

const TYPE_ICONS:  Record<string, string> = { POST: '📝', CAROUSEL: '🎠', REEL: '🎬', STORY: '⭕' }
const TYPE_LABELS: Record<string, string> = { POST: 'Post', CAROUSEL: 'Carrusel', REEL: 'Reel', STORY: 'Story' }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Borrador',  color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  APPROVED:  { label: 'Aprobado',  color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  PUBLISHED: { label: 'Publicado', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
}

const FREQ_LABELS: Record<string, string> = { DAILY: 'Diario', WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal', MONTHLY: 'Mensual' }
const FREQ_PERIOD: Record<string, string> = { DAILY: 'día', WEEKLY: 'semana', BIWEEKLY: 'quincena', MONTHLY: 'mes' }
const DAYS_ES   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Prisma returns full ISO strings (e.g. "2025-01-06T00:00:00.000Z").
// Adding 'T12:00:00' to those breaks parsing, so we detect and handle both formats.
function toLocalDate(dateStr: string): Date {
  if (dateStr.length > 10) return new Date(dateStr)
  return new Date(dateStr + 'T12:00:00')
}

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}

function groupByWeek(items: CalendarItem[]) {
  const map = new Map<string, CalendarItem[]>()
  for (const item of items) {
    const date = toLocalDate(item.scheduledDate)
    const key = getMonday(date).toISOString().slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weekItems]) => ({
      weekStart,
      items: weekItems.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
    }))
}

function formatWeekRange(weekStart: string) {
  const mon = toLocalDate(weekStart)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const m1 = MONTHS_ES[mon.getMonth()], m2 = MONTHS_ES[sun.getMonth()]
  return m1 === m2
    ? `${mon.getDate()} al ${sun.getDate()} de ${m1}`
    : `${mon.getDate()} de ${m1} al ${sun.getDate()} de ${m2}`
}

function formatDayLabel(dateStr: string) {
  const d = toLocalDate(dateStr)
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`
}

export default function PlanificadorPage() {
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCalId, setExpandedCalId] = useState<string | null>(null)
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const [confirmDeleteCalId, setConfirmDeleteCalId] = useState<string | null>(null)
  const [deletingCalId, setDeletingCalId] = useState<string | null>(null)
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)
  const [approvingPostId, setApprovingPostId] = useState<string | null>(null)
  const [approvingAllCalId, setApprovingAllCalId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [frequency, setFrequency] = useState('WEEKLY')
  const [postsPerPeriod, setPostsPerPeriod] = useState('3')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10)
  })
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['INSTAGRAM'])

  // Compute estimated total posts
  const estimatedTotal = useMemo(() => {
    const s = new Date(startDate + 'T12:00:00')
    const e = new Date(endDate   + 'T12:00:00')
    if (e < s) return 0
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
    const ppp = Math.min(parseInt(postsPerPeriod) || 1, 10)
    const periods = frequency === 'DAILY'    ? days
                  : frequency === 'WEEKLY'   ? Math.ceil(days / 7)
                  : frequency === 'BIWEEKLY' ? Math.ceil(days / 14)
                  : Math.ceil(days / 30) // MONTHLY
    return Math.min(periods * ppp, 60)
  }, [frequency, postsPerPeriod, startDate, endDate])

  const fetchCalendars = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketing/autopilot')
      const data = await res.json()
      setCalendars(data.calendars ?? [])
      if (data.calendars?.length > 0) setExpandedCalId(data.calendars[0].id)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCalendars() }, [fetchCalendars])

  function togglePlatform(p: string) {
    setSelectedPlatforms(prev =>
      prev.includes(p)
        ? prev.length > 1 ? prev.filter(x => x !== p) : prev
        : [...prev, p]
    )
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/marketing/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || null, frequency, postsPerPeriod: parseInt(postsPerPeriod), startDate, endDate, platforms: selectedPlatforms }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al generar')
      await fetchCalendars()
      setExpandedCalId(data.calendar.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  async function handleApprovePost(postId: string, calendarId: string) {
    setApprovingPostId(postId)
    try {
      await fetch(`/api/marketing/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      setCalendars(prev => prev.map(cal => cal.id !== calendarId ? cal : {
        ...cal,
        items: cal.items.map(item =>
          item.socialPost.id === postId ? { ...item, socialPost: { ...item.socialPost, status: 'APPROVED' } } : item
        ),
      }))
    } finally {
      setApprovingPostId(null)
    }
  }

  async function handleApproveAll(calendarId: string) {
    const cal = calendars.find(c => c.id === calendarId)
    if (!cal) return
    const drafts = cal.items.filter(i => i.socialPost.status === 'DRAFT').map(i => i.socialPost.id)
    if (!drafts.length) return
    setApprovingAllCalId(calendarId)
    try {
      await Promise.all(drafts.map(id =>
        fetch(`/api/marketing/posts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        })
      ))
      setCalendars(prev => prev.map(c => c.id !== calendarId ? c : {
        ...c,
        items: c.items.map(item => ({
          ...item,
          socialPost: { ...item.socialPost, status: item.socialPost.status === 'PUBLISHED' ? 'PUBLISHED' : 'APPROVED' },
        })),
      }))
    } finally {
      setApprovingAllCalId(null)
    }
  }

  async function handleDeletePost(postId: string, calendarId: string) {
    setDeletingPostId(postId)
    try {
      await fetch(`/api/marketing/autopilot?postId=${postId}&calendarId=${calendarId}`, { method: 'DELETE' })
      setCalendars(prev => prev.map(cal => cal.id !== calendarId ? cal : {
        ...cal, items: cal.items.filter(i => i.socialPost.id !== postId),
      }))
      if (expandedPostId === postId) setExpandedPostId(null)
    } finally {
      setDeletingPostId(null)
    }
  }

  async function handleDeleteCalendar() {
    if (!confirmDeleteCalId) return
    const id = confirmDeleteCalId
    setConfirmDeleteCalId(null)
    setDeletingCalId(id)
    try {
      await fetch(`/api/marketing/autopilot?calendarId=${id}`, { method: 'DELETE' })
      setCalendars(prev => prev.filter(c => c.id !== id))
      if (expandedCalId === id) setExpandedCalId(null)
    } finally {
      setDeletingCalId(null)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">

      {/* Modal eliminar calendario */}
      {confirmDeleteCalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteCalId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white text-center mb-1">Eliminar calendario</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
              Se eliminarán el calendario y todos sus posts. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteCalId(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDeleteCalendar}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-medium text-white transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-4">Crear plan de contenido</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">{error}</div>
        )}

        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Selector de plataformas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plataformas</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map(p => {
                const active = selectedPlatforms.includes(p.value)
                const cfg = PLATFORM_CONFIG[p.value]
                return (
                  <button key={p.value} type="button" onClick={() => togglePlatform(p.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      active
                        ? `border-transparent ${cfg.bg} ${cfg.text}`
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-400 hover:border-gray-300'
                    }`}>
                    {p.icon}
                    {p.label}
                    {active && <span className="opacity-80 text-xs">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fila 1: Frecuencia + Posts por período */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Frecuencia</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="DAILY">Diario</option>
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quincenal</option>
                <option value="MONTHLY">Mensual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Posts por {FREQ_PERIOD[frequency] ?? 'período'}</label>
              <input type="number" min="1" max="10" value={postsPerPeriod} onChange={e => setPostsPerPeriod(e.target.value)}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha de inicio</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha de fin</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required min={startDate}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>

          {/* Título + total calculado */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Título del calendario (opcional)</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Plan Instagram Enero"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            {estimatedTotal > 0 && (
              <div className="flex-shrink-0 pb-0.5">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Total estimado: <span className="font-semibold text-gray-900 dark:text-white">{estimatedTotal} posts</span>
                  <span className="text-xs ml-1">({postsPerPeriod} por {FREQ_PERIOD[frequency] ?? 'período'})</span>
                </p>
                {estimatedTotal >= 60 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Máximo 60 posts por calendario</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button type="submit" disabled={generating}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
              {generating ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generando...</>
              ) : '✨ Generar plan con IA'}
            </button>
            {generating && <p className="text-xs text-gray-400 dark:text-slate-400">Esto puede tomar 15-30 segundos...</p>}
          </div>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && calendars.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-14 text-center">
          <p className="text-5xl mb-3">🤖</p>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sin planes de contenido</h3>
          <p className="text-gray-500 dark:text-slate-300 text-sm max-w-xs mx-auto">
            Elige las plataformas, la frecuencia y genera tu primer calendario editorial con IA.
          </p>
        </div>
      )}

      {/* Calendarios */}
      {!loading && calendars.map(cal => {
        const approved = cal.items.filter(i => ['APPROVED', 'PUBLISHED'].includes(i.socialPost.status)).length
        const total = cal.items.length
        const pct = total > 0 ? Math.round((approved / total) * 100) : 0
        const weeks = groupByWeek(cal.items)
        const isExpanded = expandedCalId === cal.id

        const byType = cal.items.reduce<Record<string, number>>((acc, i) => {
          acc[i.socialPost.contentType] = (acc[i.socialPost.contentType] ?? 0) + 1
          return acc
        }, {})

        const byPlatform = cal.items.reduce<Record<string, number>>((acc, i) => {
          const p = i.socialPost.targetPlatform
          acc[p] = (acc[p] ?? 0) + 1
          return acc
        }, {})

        return (
          <div key={cal.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">

            {/* Header del calendario */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{cal.title}</h3>
                  <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                    {new Date(cal.startDate).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {' '}· {total} publicaciones · {FREQ_LABELS[cal.frequency] ?? cal.frequency}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {cal.items.some(i => i.socialPost.status === 'DRAFT') && (
                    <button onClick={() => handleApproveAll(cal.id)} disabled={approvingAllCalId === cal.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 whitespace-nowrap">
                      {approvingAllCalId === cal.id ? '...' : '✓ Aprobar todos'}
                    </button>
                  )}
                  <button onClick={() => setConfirmDeleteCalId(cal.id)} disabled={deletingCalId === cal.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-500 disabled:opacity-50">
                    {deletingCalId === cal.id ? '...' : 'Eliminar'}
                  </button>
                  <button onClick={() => setExpandedCalId(isExpanded ? null : cal.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span>{approved} de {total} aprobados</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Chips de estadísticas */}
              <div className="flex gap-2 flex-wrap">
                {Object.entries(byType).map(([type, count]) => (
                  <span key={type} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {TYPE_ICONS[type]} {count} {TYPE_LABELS[type] ?? type}
                  </span>
                ))}
                {Object.entries(byPlatform).map(([platform, count]) => {
                  const cfg = PLATFORM_CONFIG[platform]
                  if (!cfg) return null
                  return (
                    <span key={platform} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
                      {count} {cfg.label}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Vista semanal */}
            {isExpanded && (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {weeks.map(({ weekStart, items }) => (
                  <div key={weekStart}>
                    {/* Cabecera de semana */}
                    <div className="px-6 py-2 bg-gray-50/70 dark:bg-gray-700/20">
                      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        Semana del {formatWeekRange(weekStart)}
                      </p>
                    </div>

                    {/* Posts de la semana */}
                    {items.map(item => {
                      const post = item.socialPost
                      const platCfg = PLATFORM_CONFIG[post.targetPlatform]
                      const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.DRAFT
                      const isPostExpanded = expandedPostId === post.id

                      return (
                        <div key={item.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                          <div className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/10">
                            {/* Día */}
                            <div className="w-20 flex-shrink-0">
                              <span className="text-xs font-medium text-gray-500 dark:text-slate-400 whitespace-nowrap">
                                {formatDayLabel(item.scheduledDate)}
                              </span>
                            </div>

                            {/* Plataforma */}
                            {platCfg && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${platCfg.bg} ${platCfg.text}`}>
                                {platCfg.icon}
                                <span className="hidden sm:inline">{platCfg.label}</span>
                              </div>
                            )}

                            {/* Tipo */}
                            <span className="text-base flex-shrink-0">{TYPE_ICONS[post.contentType] ?? '📝'}</span>

                            {/* Tema */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                {post.topic ?? post.content.slice(0, 70)}
                              </p>
                              {post.suggestedTime && (
                                <p className="text-xs text-gray-400 dark:text-slate-500">🕐 {post.suggestedTime}</p>
                              )}
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                                {statusCfg.label}
                              </span>
                              <button
                                onClick={() => setExpandedPostId(isPostExpanded ? null : post.id)}
                                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                                {isPostExpanded ? 'Ocultar' : 'Ver'}
                              </button>
                              {post.status === 'DRAFT' && (
                                <button
                                  onClick={() => handleApprovePost(post.id, cal.id)}
                                  disabled={approvingPostId === post.id}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50">
                                  {approvingPostId === post.id ? '...' : 'Aprobar'}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeletePost(post.id, cal.id)}
                                disabled={deletingPostId === post.id}
                                className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-500 disabled:opacity-50">
                                {deletingPostId === post.id ? '...' : '✕'}
                              </button>
                            </div>
                          </div>

                          {/* Contenido expandido */}
                          {isPostExpanded && (
                            <div className="mx-6 mb-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 p-4 space-y-3">
                              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                {post.content}
                              </p>
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
                                <AIImage
                                  prompt={post.imagePrompt}
                                  aspect="1/1"
                                  accentColor={post.targetPlatform === 'INSTAGRAM' ? 'pink' : 'blue'}
                                  downloadName={`imagen-${post.id}.jpg`}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
