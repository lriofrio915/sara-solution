'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

const APPT_TYPES = [
  { value: 'IN_PERSON',   label: 'Presencial',     icon: '🏥' },
  { value: 'TELECONSULT', label: 'Teleconsulta',    icon: '💻' },
  { value: 'HOME_VISIT',  label: 'Visita domicilio',icon: '🏠' },
  { value: 'FOLLOW_UP',   label: 'Seguimiento',     icon: '🔄' },
  { value: 'EMERGENCY',   label: 'Emergencia',      icon: '🚨' },
]

interface Patient { id: string; name: string; phone: string | null }
interface Slot { time: string }

export default function NewAppointmentPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Patient search
  const [patientQ, setPatientQ] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // Form
  const [form, setForm] = useState({
    date: '',
    time: '',
    duration: 30,
    type: 'IN_PERSON',
    reason: '',
    notes: '',
  })

  // Available slots
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Search patients debounced
  useEffect(() => {
    if (patientQ.length < 2) { setPatients([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(patientQ)}&limit=8`)
      const data = await res.json()
      setPatients(data.patients ?? [])
      setShowDropdown(true)
    }, 300)
    return () => clearTimeout(t)
  }, [patientQ])

  // Load available slots when date changes
  useEffect(() => {
    if (!form.date) { setSlots([]); return }
    // We need the doctor slug — fetch from profile
    const fetchSlots = async () => {
      setLoadingSlots(true)
      try {
        const profileRes = await fetch('/api/profile')
        const profile = await profileRes.json()
        if (profile.slug) {
          const res = await fetch(`/api/${profile.slug}/slots?date=${form.date}`)
          const data = await res.json()
          setSlots(data.slots ?? [])
        }
      } catch { setSlots([]) }
      finally { setLoadingSlots(false) }
    }
    fetchSlots()
  }, [form.date])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient) { setError('Selecciona un paciente'); return }
    if (!form.date || !form.time) { setError('Selecciona fecha y hora'); return }

    setSaving(true)
    setError(null)

    try {
      // Build ISO datetime with Ecuador timezone offset (UTC-5) so the server stores the correct UTC time
      const dateTime = `${form.date}T${form.time}:00-05:00`
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          date: dateTime,
          duration: form.duration,
          type: form.type,
          reason: form.reason || null,
          notes: form.notes || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar')
      }

      // Toast de confirmación
      const apptDate = new Date(`${form.date}T${form.time}:00-05:00`)
      const apptLabel = apptDate.toLocaleDateString('es-EC', {
        timeZone: 'America/Guayaquil', weekday: 'long', day: 'numeric', month: 'long',
      })
      const apptTime = apptDate.toLocaleTimeString('es-EC', {
        timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit',
      })
      toast.success(`Cita agendada: ${apptLabel} a las ${apptTime}`, { duration: 5000 })

      // Redirect to the filter that will show the newly created appointment
      const now = new Date()
      const todayStart = new Date(now.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }) + 'T00:00:00-05:00')
      const todayEnd   = new Date(todayStart.getTime() + 86_400_000)
      const weekEnd    = new Date(todayStart.getTime() + 7 * 86_400_000)
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      let targetFilter = 'all'
      if (apptDate >= todayStart && apptDate < todayEnd) targetFilter = 'today'
      else if (apptDate >= todayEnd && apptDate < weekEnd) targetFilter = 'week'
      else if (apptDate >= weekEnd && apptDate < monthEnd) targetFilter = 'month'

      router.push(`/appointments?filter=${targetFilter}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar cita')
      setSaving(false)
    }
  }

  // Min date = today
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/appointments" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-sm">
          ← Citas
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nueva cita</h1>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Paciente */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
            Paciente
          </h2>

          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{selectedPatient.name}</p>
                {selectedPatient.phone && <p className="text-xs text-gray-400">{selectedPatient.phone}</p>}
              </div>
              <button type="button" onClick={() => { setSelectedPatient(null); setPatientQ('') }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Cambiar
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={patientQ}
                onChange={(e) => setPatientQ(e.target.value)}
                onFocus={() => patients.length > 0 && setShowDropdown(true)}
                placeholder="Buscar paciente por nombre o cédula..."
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
              />
              {showDropdown && patients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                  {patients.map((p) => (
                    <button key={p.id} type="button"
                      onClick={() => { setSelectedPatient(p); setPatientQ(p.name); setShowDropdown(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                        {p.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                        {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1.5">
                ¿Paciente nuevo?{' '}
                <Link href="/patients/new" className="text-primary hover:underline">Registrarlo aquí</Link>
              </p>
            </div>
          )}
        </div>

        {/* Fecha y hora */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
            Fecha y hora
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha</label>
            <input type="date" min={today}
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value, time: '' }))}
              required
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {form.date && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Hora
                {loadingSlots && <span className="ml-2 text-xs text-gray-400">Cargando disponibilidad...</span>}
              </label>

              {slots.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button key={slot} type="button"
                        onClick={() => setForm((p) => ({ ...p, time: slot }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          form.time === slot
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary'
                        }`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{slots.length} horarios disponibles</p>
                </>
              ) : !loadingSlots ? (
                <>
                  <input type="time"
                    value={form.time}
                    onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                    required
                    className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Configura tu horario en{' '}
                    <Link href="/profile" className="text-primary hover:underline">Mi Perfil</Link>
                    {' '}para ver slots disponibles automáticamente.
                  </p>
                </>
              ) : null}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Duración</label>
            <div className="flex gap-2 flex-wrap">
              {[15, 20, 30, 45, 60].map((min) => (
                <button key={min} type="button"
                  onClick={() => setForm((p) => ({ ...p, duration: min }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.duration === min
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary'
                  }`}>
                  {min} min
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tipo y motivo */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
            Tipo y motivo
          </h2>

          <div className="flex flex-wrap gap-2">
            {APPT_TYPES.map((t) => (
              <button key={t.value} type="button"
                onClick={() => setForm((p) => ({ ...p, type: t.value }))}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  form.type === t.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary'
                }`}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Motivo de consulta
            </label>
            <input type="text"
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Ej: Control de presión, revisión general..."
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Notas internas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              placeholder="Notas visibles solo para ti..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
            {saving ? 'Guardando...' : 'Agendar cita'}
          </button>
          <Link href="/appointments" className="btn-outline">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
