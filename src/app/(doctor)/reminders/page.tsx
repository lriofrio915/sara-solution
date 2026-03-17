'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Metadata } from 'next'

// Metadata can't be exported from 'use client', so it's set via the parent layout.
// title is set in the <head> below via useEffect.

interface Reminder {
  id: string
  title: string
  description: string | null
  dueDate: string
  completed: boolean
  completedAt: string | null
  priority: string
  category: string | null
  createdAt: string
}

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const PRIORITY_DOT: Record<string, string> = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-orange-500',
  URGENT: 'bg-red-500',
}

function formatDueDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffMs = target.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / 86400000)

  const timeStr = d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
  const dateStr = d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })

  if (diffDays === 0) return { label: `Hoy · ${timeStr}`, overdue: false, today: true }
  if (diffDays === 1) return { label: `Mañana · ${timeStr}`, overdue: false, today: false }
  if (diffDays < 0) return { label: `Vencido · ${dateStr}`, overdue: true, today: false }
  return { label: dateStr, overdue: false, today: false }
}

const EMPTY_FORM = {
  title: '',
  description: '',
  dueDate: '',
  dueTime: '09:00',
  priority: 'MEDIUM',
  category: '',
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchReminders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reminders?filter=${filter}`)
      if (res.ok) setReminders(await res.json())
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchReminders() }, [fetchReminders])

  function openNew() {
    const now = new Date()
    now.setDate(now.getDate() + 1)
    setForm({
      ...EMPTY_FORM,
      dueDate: now.toISOString().split('T')[0],
    })
    setEditId(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(r: Reminder) {
    const d = new Date(r.dueDate)
    setForm({
      title: r.title,
      description: r.description ?? '',
      dueDate: d.toISOString().split('T')[0],
      dueTime: d.toTimeString().slice(0, 5),
      priority: r.priority,
      category: r.category ?? '',
    })
    setEditId(r.id)
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('El título es requerido'); return }
    if (!form.dueDate) { setError('La fecha es requerida'); return }

    setSaving(true)
    setError('')
    try {
      const dueDate = new Date(`${form.dueDate}T${form.dueTime}:00`)
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: dueDate.toISOString(),
        priority: form.priority,
        category: form.category.trim() || null,
      }

      const url = editId ? `/api/reminders/${editId}` : '/api/reminders'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al guardar')
        return
      }

      setShowForm(false)
      fetchReminders()
    } finally {
      setSaving(false)
    }
  }

  async function toggleComplete(r: Reminder) {
    const res = await fetch(`/api/reminders/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !r.completed }),
    })
    if (res.ok) fetchReminders()
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteId(null)
      fetchReminders()
    }
  }

  const pendingCount = reminders.filter((r) => !r.completed).length

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🔔 Recordatorios
          </h1>
          <p className="text-gray-500 dark:text-slate-300 text-sm mt-0.5">
            {filter === 'pending'
              ? `${pendingCount} recordatorio${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}`
              : filter === 'completed'
                ? 'Recordatorios completados'
                : 'Todos los recordatorios'}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 w-fit">
        {(['pending', 'all', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {f === 'pending' ? 'Pendientes' : f === 'completed' ? 'Completados' : 'Todos'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-medium text-gray-500 dark:text-slate-300">No hay recordatorios {filter === 'pending' ? 'pendientes' : filter === 'completed' ? 'completados' : ''}</p>
          <p className="text-sm mt-1">
            {filter === 'pending'
              ? 'Crea uno nuevo o pídele a Sara que lo haga por ti'
              : 'Cambia el filtro para ver otros recordatorios'}
          </p>
          {filter === 'pending' && (
            <button
              onClick={openNew}
              className="mt-4 inline-flex items-center gap-1.5 text-primary font-medium text-sm hover:underline"
            >
              + Crear recordatorio
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((r) => {
            const due = formatDueDate(r.dueDate)
            return (
              <div
                key={r.id}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                  r.completed
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-60'
                    : due.overdue
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(r)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    r.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                  }`}
                  aria-label={r.completed ? 'Marcar pendiente' : 'Marcar completado'}
                >
                  {r.completed && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm leading-snug ${r.completed ? 'line-through text-gray-400 dark:text-slate-400' : 'text-gray-900 dark:text-white'}`}>
                      {r.title}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Editar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteId(r.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label="Eliminar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {r.description && (
                    <p className="text-xs text-gray-500 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {r.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Priority badge */}
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[r.priority] ?? PRIORITY_COLOR.MEDIUM}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[r.priority] ?? PRIORITY_DOT.MEDIUM}`} />
                      {PRIORITY_LABEL[r.priority] ?? r.priority}
                    </span>

                    {/* Category */}
                    {r.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 font-medium">
                        {r.category}
                      </span>
                    )}

                    {/* Due date */}
                    <span className={`text-xs font-medium ${
                      r.completed
                        ? 'text-gray-400 dark:text-slate-400'
                        : due.overdue
                          ? 'text-red-600 dark:text-red-400'
                          : due.today
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-500 dark:text-slate-300'
                    }`}>
                      📅 {due.label}
                    </span>

                    {r.completed && r.completedAt && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ✓ Completado {new Date(r.completedAt).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">
                {editId ? 'Editar recordatorio' : 'Nuevo recordatorio'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Llamar a paciente Juan Pérez"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Detalles adicionales..."
                  rows={2}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              {/* Date + time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={form.dueTime}
                    onChange={(e) => setForm((f) => ({ ...f, dueTime: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Priority + category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="Ej: Pacientes, Admin"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Crear recordatorio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">¿Eliminar recordatorio?</h3>
            <p className="text-gray-500 dark:text-slate-300 text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
