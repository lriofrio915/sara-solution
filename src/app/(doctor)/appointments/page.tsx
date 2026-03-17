'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { X, Calendar, Clock, User, Phone, ChevronRight, Pencil } from 'lucide-react'

type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
type AppointmentType = 'IN_PERSON' | 'TELECONSULT' | 'HOME_VISIT' | 'EMERGENCY' | 'FOLLOW_UP'

interface Appointment {
  id: string
  date: string
  duration: number
  status: AppointmentStatus
  type: AppointmentType
  reason: string | null
  notes: string | null
  patient: { id: string; name: string; phone: string | null }
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; dot: string; btn: string }> = {
  SCHEDULED: { label: 'Programada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',   dot: 'bg-blue-500',   btn: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100' },
  CONFIRMED:  { label: 'Confirmada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', dot: 'bg-green-500', btn: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100' },
  COMPLETED:  { label: 'Completada', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',       dot: 'bg-gray-400',  btn: 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100' },
  CANCELLED:  { label: 'Cancelada',  color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',       dot: 'bg-red-400',   btn: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100' },
  NO_SHOW:    { label: 'No asistió', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', dot: 'bg-orange-400', btn: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100' },
}

const TYPE_CONFIG: Record<AppointmentType, { icon: string; label: string }> = {
  IN_PERSON:   { icon: '🏥', label: 'Presencial' },
  TELECONSULT: { icon: '💻', label: 'Teleconsulta' },
  HOME_VISIT:  { icon: '🏠', label: 'Visita domicilio' },
  EMERGENCY:   { icon: '🚨', label: 'Emergencia' },
  FOLLOW_UP:   { icon: '🔄', label: 'Seguimiento' },
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
function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', {
    timeZone: 'America/Guayaquil', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Calendar helpers ──────────────────────────────────────────────────────────

function getDayKey(iso: string) {
  const d = new Date(iso)
  const ec = new Date(d.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }))
  return `${ec.getFullYear()}-${ec.getMonth()}-${ec.getDate()}`
}

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const cells: { day: number; month: 'prev' | 'current' | 'next' }[] = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, month: 'prev' })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, month: 'current' })
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) cells.push({ day: d, month: 'next' })
  return cells
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────────

function AppointmentDrawer({
  appt,
  onClose,
  onStatusChange,
  onReschedule,
  updating,
}: {
  appt: Appointment
  onClose: () => void
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>
  onReschedule: (id: string, date: string, time: string) => Promise<void>
  updating: boolean
}) {
  const statusInfo = STATUS_CONFIG[appt.status]
  const typeInfo = TYPE_CONFIG[appt.type]
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const d = new Date(appt.date)
    const toEC = new Date(d.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }))
    setRescheduleDate(toEC.toISOString().slice(0, 10))
    setRescheduleTime(toEC.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }))
  }, [appt.date])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleReschedule() {
    if (!rescheduleDate || !rescheduleTime) return
    setSaving(true)
    await onReschedule(appt.id, rescheduleDate, rescheduleTime)
    setSaving(false)
    setShowReschedule(false)
  }

  const canAct = appt.status === 'SCHEDULED' || appt.status === 'CONFIRMED'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{typeInfo.icon}</span>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">{typeInfo.label}</p>
              <p className="text-xs text-gray-400">{formatDate(appt.date)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${statusInfo.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
              {statusInfo.label}
            </span>
            <span className="text-xs text-gray-400">#{appt.id.slice(-8)}</span>
          </div>

          {/* Patient */}
          <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Paciente</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/patients/${appt.patient.id}`}
                  onClick={onClose}
                  className="font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors text-sm flex items-center gap-1 group">
                  {appt.patient.name}
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                {appt.patient.phone && (
                  <a href={`tel:${appt.patient.phone}`} className="text-xs text-gray-400 hover:text-primary flex items-center gap-1 mt-0.5">
                    <Phone size={11} />
                    {appt.patient.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Date/time/duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Calendar size={14} />
                <span className="text-xs font-medium">Fecha</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{formatDateLong(appt.date)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Clock size={14} />
                <span className="text-xs font-medium">Hora · Duración</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatTime(appt.date)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{appt.duration} minutos</p>
            </div>
          </div>

          {/* Reason / notes */}
          {(appt.reason || appt.notes) && (
            <div className="space-y-2">
              {appt.reason && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Motivo</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3.5">{appt.reason}</p>
                </div>
              )}
              {appt.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Notas</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3.5">{appt.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {canAct && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Acciones</p>
              <div className="flex flex-wrap gap-2">
                {appt.status === 'SCHEDULED' && (
                  <button onClick={() => onStatusChange(appt.id, 'CONFIRMED')} disabled={updating}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 disabled:opacity-50 transition-colors">
                    ✓ Confirmar
                  </button>
                )}
                {appt.status === 'CONFIRMED' && (
                  <button onClick={() => onStatusChange(appt.id, 'COMPLETED')} disabled={updating}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 disabled:opacity-50 transition-colors">
                    ✓ Completar
                  </button>
                )}
                <button onClick={() => setShowReschedule(v => !v)} disabled={updating}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 disabled:opacity-50 transition-colors">
                  📅 Reagendar
                </button>
                <button onClick={() => onStatusChange(appt.id, 'NO_SHOW')} disabled={updating}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 disabled:opacity-50 transition-colors">
                  No asistió
                </button>
                <button onClick={() => onStatusChange(appt.id, 'CANCELLED')} disabled={updating}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 disabled:opacity-50 transition-colors">
                  ✕ Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Reschedule inline */}
          {showReschedule && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">Nueva fecha y hora</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-300 mb-1 block">Fecha</label>
                  <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-300 mb-1 block">Hora</label>
                  <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowReschedule(false)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleReschedule} disabled={saving || !rescheduleDate || !rescheduleTime}
                  className="flex-1 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {saving ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-700">
          <Link href={`/patients/${appt.patient.id}`} onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <User size={15} />
            Ver expediente de {appt.patient.name.split(' ')[0]}
          </Link>
        </div>
      </div>
    </>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

const VALID_FILTERS = ['today', 'week', 'month', 'all']

function AppointmentsContent() {
  const searchParams = useSearchParams()
  const [view, setView] = useState<'list' | 'calendar'>('list')

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const initialFilter = searchParams.get('filter')
  const [filter, setFilter] = useState(VALID_FILTERS.includes(initialFilter ?? '') ? initialFilter! : 'today')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  // Calendar state
  const [calDate, setCalDate] = useState(() => new Date())
  const [calAppointments, setCalAppointments] = useState<Appointment[]>([])
  const [calLoading, setCalLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // ── Fetchers ──────────────────────────────────────────────────────────────────
  const fetchList = useCallback(async (f: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments?filter=${f}`)
      const data = await res.json()
      setAppointments(data.appointments ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (view === 'list') fetchList(filter) }, [view, filter, fetchList])

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
      const patch = (a: Appointment) => a.id === id ? { ...a, status } : a
      setAppointments(prev => prev.map(patch))
      setCalAppointments(prev => prev.map(patch))
      setSelectedAppt(prev => prev?.id === id ? { ...prev, status } : prev)
    } finally { setUpdatingId(null) }
  }

  async function reschedule(id: string, date: string, time: string) {
    const newDate = new Date(`${date}T${time}:00`)
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: newDate.toISOString() }),
    })
    const updatedDate = newDate.toISOString()
    const patch = (a: Appointment) => a.id === id ? { ...a, date: updatedDate, status: 'SCHEDULED' as AppointmentStatus } : a
    setAppointments(prev => prev.map(patch))
    setCalAppointments(prev => prev.map(patch))
    setSelectedAppt(prev => prev?.id === id ? { ...prev, date: updatedDate, status: 'SCHEDULED' } : prev)
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
  const selectedDayAppts = selectedKey ? (apptsByDay[selectedKey] ?? []) : []

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

  // ── Appointment row ──────────────────────────────────────────────────────────
  function AppointmentRow({ a }: { a: Appointment }) {
    const statusInfo = STATUS_CONFIG[a.status]
    const typeInfo = TYPE_CONFIG[a.type]
    return (
      <button
        onClick={() => setSelectedAppt(a)}
        className="w-full text-left flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-primary/5 dark:hover:bg-primary/10 active:bg-primary/10 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 cursor-pointer group"
      >
        {/* Time */}
        <div className="flex-shrink-0 w-16 text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{formatTime(a.date)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{a.duration} min</p>
        </div>

        <div className="hidden sm:block w-px h-10 bg-gray-100 dark:bg-gray-700 flex-shrink-0" />

        {/* Patient info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">{typeInfo.icon}</span>
            <span className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-primary transition-colors">
              {a.patient.name}
            </span>
            {a.patient.phone && (
              <span className="text-xs text-gray-400 hidden sm:inline">{a.patient.phone}</span>
            )}
          </div>
          {a.reason && (
            <p className="text-xs text-gray-500 dark:text-slate-300 mt-0.5 truncate">{a.reason}</p>
          )}
        </div>

        {/* Status + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <Pencil size={13} className="text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors" />
        </div>
      </button>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Citas</h1>
          <p className="text-gray-500 dark:text-slate-300 mt-0.5 text-sm">Agenda y gestión de citas médicas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              ☰ Lista
            </button>
            <button onClick={() => setView('calendar')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'calendar'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-gray-200'
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
              <p className="text-gray-500 dark:text-slate-300 mb-6 text-sm">
                Crea una cita manualmente o pídele a Sara que te ayude.
              </p>
              <Link href="/appointments/new" className="btn-primary">Nueva cita</Link>
            </div>
          )}

          {!loading && appointments.length > 0 && (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, appts]) => (
                <div key={date}>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-400 mb-3 px-1">{date}</h2>
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-slate-300 transition-colors">‹</button>
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{MONTHS[month]} {year}</h2>
                {calLoading && <p className="text-xs text-primary animate-pulse">Cargando...</p>}
                {!calLoading && <p className="text-xs text-gray-400">{calAppointments.length} cita{calAppointments.length !== 1 ? 's' : ''} este mes</p>}
              </div>
              <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-slate-300 transition-colors">›</button>
            </div>

            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
              {WEEKDAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wide">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                const cellKey = cell.month === 'current' ? `${year}-${month}-${cell.day}` : null
                const dayAppts = cellKey ? (apptsByDay[cellKey] ?? []) : []
                const isToday = cellKey === todayKey
                const isSelected = cell.month === 'current' && selectedDay === cell.day
                const isCurrentMonth = cell.month === 'current'
                return (
                  <div key={i}
                    onClick={() => isCurrentMonth && setSelectedDay(prev => prev === cell.day ? null : cell.day)}
                    className={`min-h-[72px] p-1.5 border-r border-b border-gray-50 dark:border-gray-700/50 last:border-r-0 transition-colors ${
                      isCurrentMonth ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10' : 'opacity-30'
                    } ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                      isToday ? 'bg-primary text-white' : isSelected ? 'bg-primary/20 text-primary' : 'text-gray-700 dark:text-gray-300'
                    }`}>{cell.day}</div>
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 3).map(a => (
                        <div key={a.id} className={`h-1.5 rounded-full ${STATUS_CONFIG[a.status].dot}`} />
                      ))}
                      {dayAppts.length > 3 && <p className="text-[10px] text-gray-400 dark:text-slate-400 leading-none">+{dayAppts.length - 3}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap px-1">
            {Object.entries(STATUS_CONFIG).slice(0, 4).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-300">
                <div className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
                {val.label}
              </div>
            ))}
          </div>

          {/* Selected day */}
          {selectedDay !== null && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {selectedDay} de {MONTHS[month]} — {selectedDayAppts.length} cita{selectedDayAppts.length !== 1 ? 's' : ''}
                </h3>
                <Link href="/appointments/new" className="text-xs text-primary hover:underline">+ Agregar</Link>
              </div>
              {selectedDayAppts.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-gray-400 dark:text-slate-400 text-sm">No hay citas este día</p>
                  <Link href="/appointments/new" className="btn-primary mt-4 inline-block text-sm">Nueva cita</Link>
                </div>
              ) : (
                <div>
                  {selectedDayAppts
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(a => <AppointmentRow key={a.id} a={a} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL DRAWER ─────────────────────────────────────────────────────── */}
      {selectedAppt && (
        <AppointmentDrawer
          appt={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onStatusChange={updateStatus}
          onReschedule={reschedule}
          updating={updatingId === selectedAppt.id}
        />
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
