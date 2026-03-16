'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
type AppointmentType = 'IN_PERSON' | 'TELECONSULT' | 'HOME_VISIT' | 'EMERGENCY' | 'FOLLOW_UP'

interface Appointment {
  id: string
  date: string
  duration: number
  status: AppointmentStatus
  type: AppointmentType
  reason: string | null
  patient: { id: string; name: string; phone: string | null }
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; dot: string }> = {
  SCHEDULED: { label: 'Programada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',   dot: 'bg-blue-500' },
  CONFIRMED:  { label: 'Confirmada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', dot: 'bg-green-500' },
  COMPLETED:  { label: 'Completada', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',       dot: 'bg-gray-400' },
  CANCELLED:  { label: 'Cancelada',  color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',       dot: 'bg-red-400' },
  NO_SHOW:    { label: 'No asistió', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', dot: 'bg-orange-400' },
}

const TYPE_ICON: Record<AppointmentType, string> = {
  IN_PERSON:   '🏥',
  TELECONSULT: '💻',
  HOME_VISIT:  '🏠',
  EMERGENCY:   '🚨',
  FOLLOW_UP:   '🔄',
}

const LIST_FILTERS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week',  label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'all',   label: 'Todas' },
]

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-EC', {
    timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit',
  })
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', {
    timeZone: 'America/Guayaquil', weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ─── Calendar helpers ──────────────────────────────────────────────────────────

function getDayKey(iso: string) {
  const d = new Date(iso)
  // Convert to Ecuador time
  const ec = new Date(d.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }))
  return `${ec.getFullYear()}-${ec.getMonth()}-${ec.getDate()}`
}

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { day: number; month: 'prev' | 'current' | 'next' }[] = []

  // Prev month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, month: 'prev' })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: 'current' })
  }
  // Next month padding
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, month: 'next' })
  }
  return cells
}

// ─── Main component ────────────────────────────────────────────────────────────

const VALID_FILTERS = ['today', 'week', 'month', 'all']

function AppointmentsContent() {
  const searchParams = useSearchParams()
  const [view, setView] = useState<'list' | 'calendar'>('list')

  // List view state
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const initialFilter = searchParams.get('filter')
  const [filter, setFilter] = useState(VALID_FILTERS.includes(initialFilter ?? '') ? initialFilter! : 'today')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleSaving, setRescheduleSaving] = useState(false)

  // Calendar view state
  const [calDate, setCalDate] = useState(() => new Date())
  const [calAppointments, setCalAppointments] = useState<Appointment[]>([])
  const [calLoading, setCalLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // ── List fetch ────────────────────────────────────────────────────────────────
  const fetchList = useCallback(async (f: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments?filter=${f}`)
      const data = await res.json()
      setAppointments(data.appointments ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (view === 'list') fetchList(filter) }, [view, filter, fetchList])

  // ── Calendar fetch ────────────────────────────────────────────────────────────
  const fetchCalendar = useCallback(async (year: number, month: number) => {
    setCalLoading(true)
    setSelectedDay(null)
    try {
      const start = new Date(year, month, 1).toISOString()
      const end   = new Date(year, month + 1, 1).toISOString()
      const res = await fetch(`/api/appointments?startDate=${start}&endDate=${end}`)
      const data = await res.json()
      setCalAppointments(data.appointments ?? [])
    } finally { setCalLoading(false) }
  }, [])

  useEffect(() => {
    if (view === 'calendar') fetchCalendar(calDate.getFullYear(), calDate.getMonth())
  }, [view, calDate, fetchCalendar])

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function updateStatus(id: string, status: AppointmentStatus) {
    setUpdatingId(id)
    try {
      await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      setCalAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    } finally { setUpdatingId(null) }
  }

  function openReschedule(id: string, currentDate: string) {
    const d = new Date(currentDate)
    const toEC = new Date(d.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }))
    setRescheduleDate(toEC.toISOString().slice(0, 10))
    setRescheduleTime(toEC.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }))
    setReschedulingId(id)
  }

  async function saveReschedule() {
    if (!reschedulingId || !rescheduleDate || !rescheduleTime) return
    setRescheduleSaving(true)
    try {
      const newDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`)
      await fetch(`/api/appointments/${reschedulingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate.toISOString() }),
      })
      const updatedDate = newDate.toISOString()
      setAppointments(prev => prev.map(a => a.id === reschedulingId ? { ...a, date: updatedDate, status: 'SCHEDULED' } : a))
      setCalAppointments(prev => prev.map(a => a.id === reschedulingId ? { ...a, date: updatedDate, status: 'SCHEDULED' } : a))
      setReschedulingId(null)
    } finally { setRescheduleSaving(false) }
  }

  // ── Calendar computed ─────────────────────────────────────────────────────────
  const year  = calDate.getFullYear()
  const month = calDate.getMonth()
  const cells = buildCalendarGrid(year, month)

  const apptsByDay: Record<string, Appointment[]> = {}
  calAppointments.forEach(a => {
    const key = getDayKey(a.date)
    if (!apptsByDay[key]) apptsByDay[key] = []
    apptsByDay[key].push(a)
  })

  const selectedKey = selectedDay !== null ? `${year}-${month}-${selectedDay}` : null
  const selectedAppts = selectedKey ? (apptsByDay[selectedKey] ?? []) : []

  const todayKey = (() => {
    const ec = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }))
    return `${ec.getFullYear()}-${ec.getMonth()}-${ec.getDate()}`
  })()

  // ── List grouped ─────────────────────────────────────────────────────────────
  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, a) => {
    const key = formatDate(a.date)
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  // ── Appointment card (shared) ─────────────────────────────────────────────────
  function AppointmentRow({ a }: { a: Appointment }) {
    const statusInfo = STATUS_CONFIG[a.status]
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0">
        <div className="flex-shrink-0 w-16 text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{formatTime(a.date)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{a.duration} min</p>
        </div>
        <div className="hidden sm:block w-px h-10 bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">{TYPE_ICON[a.type]}</span>
            <Link href={`/patients/${a.patient.id}`}
              className="font-semibold text-gray-900 dark:text-white hover:text-primary text-sm">
              {a.patient.name}
            </Link>
            {a.patient.phone && <span className="text-xs text-gray-400">{a.patient.phone}</span>}
          </div>
          {a.reason && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{a.reason}</p>}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
        {(a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && (
          <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
            {a.status === 'SCHEDULED' && (
              <button onClick={() => updateStatus(a.id, 'CONFIRMED')} disabled={updatingId === a.id}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 disabled:opacity-50">
                Confirmar
              </button>
            )}
            {a.status === 'CONFIRMED' && (
              <button onClick={() => updateStatus(a.id, 'COMPLETED')} disabled={updatingId === a.id}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 disabled:opacity-50">
                Completar
              </button>
            )}
            <button onClick={() => openReschedule(a.id, a.date)} disabled={updatingId === a.id}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 disabled:opacity-50">
              Reagendar
            </button>
            <button onClick={() => updateStatus(a.id, 'CANCELLED')} disabled={updatingId === a.id}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 disabled:opacity-50">
              Cancelar
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Citas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">Agenda y gestión de citas médicas</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              ☰ Lista
            </button>
            <button onClick={() => setView('calendar')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'calendar'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              📅 Calendario
            </button>
          </div>
          <Link href="/appointments/new" className="btn-primary flex-shrink-0">+ Nueva cita</Link>
        </div>
      </div>

      {/* ── LIST VIEW ─────────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            {LIST_FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary bg-white dark:bg-gray-800'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {!loading && appointments.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
              <p className="text-5xl mb-4">📅</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {filter === 'today' ? 'No hay citas hoy' : 'No hay citas en este período'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Crea una cita manualmente o pídele a Sara que te ayude.
              </p>
              <Link href="/appointments/new" className="btn-primary">Nueva cita</Link>
            </div>
          )}

          {!loading && appointments.length > 0 && (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, appts]) => (
                <div key={date}>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-1">{date}</h2>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {appts.map(a => <AppointmentRow key={a.id} a={a} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CALENDAR VIEW ─────────────────────────────────────────────────────── */}
      {view === 'calendar' && (
        <div className="space-y-4">

          {/* Month navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                ‹
              </button>
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {MONTHS[month]} {year}
                </h2>
                {calLoading && <p className="text-xs text-primary animate-pulse">Cargando...</p>}
                {!calLoading && (
                  <p className="text-xs text-gray-400">
                    {calAppointments.length} cita{calAppointments.length !== 1 ? 's' : ''} este mes
                  </p>
                )}
              </div>
              <button
                onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                ›
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
              {WEEKDAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                const cellKey = cell.month === 'current' ? `${year}-${month}-${cell.day}` : null
                const dayAppts = cellKey ? (apptsByDay[cellKey] ?? []) : []
                const isToday = cellKey === todayKey
                const isSelected = cell.month === 'current' && selectedDay === cell.day
                const isCurrentMonth = cell.month === 'current'

                return (
                  <div
                    key={i}
                    onClick={() => isCurrentMonth && setSelectedDay(prev => prev === cell.day ? null : cell.day)}
                    className={`min-h-[72px] p-1.5 border-r border-b border-gray-50 dark:border-gray-700/50 last:border-r-0 transition-colors ${
                      isCurrentMonth ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30' : 'opacity-30'
                    } ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>

                    {/* Day number */}
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                      isToday
                        ? 'bg-primary text-white'
                        : isSelected
                        ? 'bg-primary/20 text-primary dark:text-primary'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {cell.day}
                    </div>

                    {/* Appointment dots */}
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 3).map(a => (
                        <div key={a.id} className={`h-1.5 rounded-full ${STATUS_CONFIG[a.status].dot}`} />
                      ))}
                      {dayAppts.length > 3 && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">+{dayAppts.length - 3}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap px-1">
            {Object.entries(STATUS_CONFIG).slice(0, 4).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
                {val.label}
              </div>
            ))}
          </div>

          {/* Selected day appointments */}
          {selectedDay !== null && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {selectedDay} de {MONTHS[month]} — {selectedAppts.length} cita{selectedAppts.length !== 1 ? 's' : ''}
                </h3>
                <Link href="/appointments/new" className="text-xs text-primary hover:underline">+ Agregar</Link>
              </div>
              {selectedAppts.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">No hay citas este día</p>
                  <Link href="/appointments/new" className="btn-primary mt-4 inline-block text-sm">Nueva cita</Link>
                </div>
              ) : (
                <div>
                  {selectedAppts
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(a => <AppointmentRow key={a.id} a={a} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* ── RESCHEDULE MODAL ──────────────────────────────────────────────────── */}
      {reschedulingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reagendar cita</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nueva fecha</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nueva hora</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setReschedulingId(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button
                onClick={saveReschedule}
                disabled={rescheduleSaving || !rescheduleDate || !rescheduleTime}
                className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {rescheduleSaving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AppointmentsPage() {
  return (
    <Suspense>
      <AppointmentsContent />
    </Suspense>
  )
}
