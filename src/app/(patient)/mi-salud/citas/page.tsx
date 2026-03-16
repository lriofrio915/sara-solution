'use client'

import { useState, useEffect } from 'react'

interface Appointment {
  id: string
  date: string
  duration: number
  type: string
  status: string
  reason: string | null
  notes: string | null
}

interface RescheduleState {
  id: string
  date: string
  time: string
  saving: boolean
}

const TYPE_LABEL: Record<string, string> = {
  IN_PERSON: 'Presencial', TELECONSULT: 'Teleconsulta', HOME_VISIT: 'Domicilio',
  EMERGENCY: 'Urgencia', FOLLOW_UP: 'Seguimiento',
}
const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONFIRMED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  COMPLETED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  NO_SHOW: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
}
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Programada', CONFIRMED: 'Confirmada', COMPLETED: 'Completada',
  CANCELLED: 'Cancelada', NO_SHOW: 'No asistí',
}

export default function PatientCitasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [reschedule, setReschedule] = useState<RescheduleState | null>(null)

  useEffect(() => {
    fetch('/api/patient/me/appointments')
      .then((r) => r.json())
      .then(setAppointments)
      .finally(() => setLoading(false))
  }, [])

  function openReschedule(apt: Appointment) {
    const d = new Date(apt.date)
    const toEC = new Date(d.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }))
    setReschedule({
      id: apt.id,
      date: toEC.toISOString().slice(0, 10),
      time: toEC.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      saving: false,
    })
  }

  async function saveReschedule() {
    if (!reschedule) return
    setReschedule(r => r ? { ...r, saving: true } : r)
    try {
      const newDate = new Date(`${reschedule.date}T${reschedule.time}:00`)
      await fetch(`/api/appointments/${reschedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate.toISOString() }),
      })
      const updatedDate = newDate.toISOString()
      setAppointments(prev => prev.map(a => a.id === reschedule.id ? { ...a, date: updatedDate, status: 'SCHEDULED' } : a))
      setReschedule(null)
    } catch { setReschedule(r => r ? { ...r, saving: false } : r) }
  }

  const upcoming = appointments.filter((a) => new Date(a.date) >= new Date() && a.status !== 'CANCELLED')
  const past = appointments.filter((a) => new Date(a.date) < new Date() || a.status === 'COMPLETED' || a.status === 'CANCELLED')

  if (loading) return <div className="flex justify-center pt-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      {reschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reagendar cita</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nueva fecha</label>
                <input
                  type="date"
                  value={reschedule.date}
                  onChange={e => setReschedule(r => r ? { ...r, date: e.target.value } : r)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Nueva hora</label>
                <input
                  type="time"
                  value={reschedule.time}
                  onChange={e => setReschedule(r => r ? { ...r, time: e.target.value } : r)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setReschedule(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button
                onClick={saveReschedule}
                disabled={reschedule.saving || !reschedule.date || !reschedule.time}
                className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {reschedule.saving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📅 Mis Citas</h1>

      {!appointments.length ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium">No tienes citas registradas</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                Próximas ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((apt) => <AppointmentCard key={apt.id} apt={apt} onReschedule={openReschedule} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                Historial ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function AppointmentCard({ apt, onReschedule }: { apt: Appointment; onReschedule?: (apt: Appointment) => void }) {
  const isUpcoming = new Date(apt.date) >= new Date() && apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED'
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">
          {new Date(apt.date).toLocaleDateString('es-EC', { dateStyle: 'full' })}
        </p>
        <p className="text-sm text-primary font-medium mt-0.5">
          {new Date(apt.date).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
          {' · '}{apt.duration} min
        </p>
        <p className="text-xs text-gray-400 mt-1">{TYPE_LABEL[apt.type] ?? apt.type}</p>
        {apt.reason && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Motivo: {apt.reason}</p>}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[apt.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABEL[apt.status] ?? apt.status}
        </span>
        {isUpcoming && onReschedule && (
          <button
            onClick={() => onReschedule(apt)}
            className="text-xs px-2.5 py-1 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 font-medium transition-colors">
            Reagendar
          </button>
        )}
      </div>
    </div>
  )
}
