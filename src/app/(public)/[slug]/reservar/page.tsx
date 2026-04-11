'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, Clock, User, Phone, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface DoctorInfo {
  name: string
  specialty: string
  avatarUrl: string | null
  slug: string
}

export default function ReservarPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  // ── Doctor info ──────────────────────────────────────────────
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null)
  const [loadingDoctor, setLoadingDoctor] = useState(true)

  // ── Calendar ─────────────────────────────────────────────────
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // ── Slots ────────────────────────────────────────────────────
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [noSlotMsg, setNoSlotMsg] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  // ── Form ─────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // ── Load doctor ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/public/${slug}/profile`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setDoctor(data)
        setLoadingDoctor(false)
      })
      .catch(() => setLoadingDoctor(false))
  }, [slug])

  // ── Load slots when date selected ────────────────────────────
  const loadSlots = useCallback(async (date: string) => {
    setLoadingSlots(true)
    setSlots([])
    setNoSlotMsg(null)
    setSelectedSlot(null)
    try {
      const r = await fetch(`/api/public/${slug}/availability?date=${date}`)
      const data = await r.json()
      if (data.slots?.length) {
        setSlots(data.slots)
      } else {
        setNoSlotMsg(data.message ?? 'No hay horarios disponibles ese día.')
      }
    } catch {
      setNoSlotMsg('Error cargando horarios. Inténtalo de nuevo.')
    } finally {
      setLoadingSlots(false)
    }
  }, [slug])

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr)
    loadSlots(dateStr)
  }

  // ── Calendar helpers ─────────────────────────────────────────
  function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
  function firstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay() }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function isPast(y: number, m: number, d: number): boolean {
    const dt = new Date(y, m, d)
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return dt < t
  }

  // ── Submit booking ────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate || !selectedSlot) return
    if (!name.trim() || !phone.trim()) {
      setSubmitError('Nombre y teléfono son requeridos.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/public/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, time: selectedSlot, name, phone, reason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Error al reservar. Inténtalo de nuevo.')
        return
      }
      setDone(true)
    } catch {
      setSubmitError('Error de red. Verifica tu conexión.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render: success ───────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-green-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Cita reservada!</h1>
          <p className="text-gray-500 text-sm mb-2">
            Tu cita para el <strong>{selectedDate}</strong> a las <strong>{selectedSlot}</strong> ha sido registrada.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            El médico confirmará tu cita pronto. Recibirás un recordatorio por WhatsApp.
          </p>
          <Link href={`/${slug}`}
            className="inline-block bg-primary text-white font-semibold px-6 py-3 rounded-2xl hover:bg-primary/90 transition-colors text-sm">
            Volver al perfil
          </Link>
        </div>
      </div>
    )
  }

  const totalDays = daysInMonth(viewYear, viewMonth)
  const startDay  = firstWeekday(viewYear, viewMonth)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Back link + doctor header */}
        <div>
          <Link href={`/${slug}`}
            className="inline-flex items-center gap-1 text-sm text-primary font-semibold mb-4 hover:underline">
            <ChevronLeft size={16} /> Volver al perfil
          </Link>

          {loadingDoctor ? (
            <div className="h-14 bg-white rounded-2xl animate-pulse" />
          ) : doctor ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 shadow-sm">
              {doctor.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doctor.avatarUrl} alt={doctor.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {doctor.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-bold text-gray-900 text-sm">{doctor.name}</p>
                <p className="text-gray-400 text-xs">{doctor.specialty}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={18} className="text-gray-500" />
            </button>
            <h2 className="font-bold text-gray-900 text-sm">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(d => {
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              const past = isPast(viewYear, viewMonth, d)
              const selected = selectedDate === dateStr
              return (
                <button
                  key={d}
                  disabled={past}
                  onClick={() => selectDate(dateStr)}
                  className={`h-9 w-full rounded-xl text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-primary text-white shadow-md'
                      : past
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'hover:bg-primary/10 text-gray-700'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>

        {/* Slots */}
        {selectedDate && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-primary" />
              <h3 className="font-bold text-gray-900 text-sm">Horarios disponibles</h3>
            </div>

            {loadingSlots ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({length: 8}).map((_,i) => (
                  <div key={i} className="h-9 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : noSlotMsg ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
                <AlertCircle size={16} /> {noSlotMsg}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 rounded-xl text-sm font-semibold transition-colors ${
                      selectedSlot === slot
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-50 text-gray-700 hover:bg-primary/10'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Booking form */}
        {selectedDate && selectedSlot && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-primary" />
              <h3 className="font-bold text-gray-900 text-sm">Tus datos</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Tu nombre completo"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Teléfono / WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    placeholder="+593 99 000 0000"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Motivo de consulta (opcional)
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                  placeholder="Ej: Control de presión arterial, dolor de cabeza..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-primary/5 rounded-xl px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <CalendarDays size={14} className="text-primary" />
                  <span className="font-semibold">{selectedDate}</span>
                  <span className="text-gray-400">·</span>
                  <Clock size={14} className="text-primary" />
                  <span className="font-semibold">{selectedSlot}</span>
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <AlertCircle size={14} /> {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
              >
                {submitting ? 'Reservando...' : 'Confirmar cita →'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
