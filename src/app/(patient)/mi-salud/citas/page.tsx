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

  useEffect(() => {
    fetch('/api/patient/me/appointments')
      .then((r) => r.json())
      .then(setAppointments)
      .finally(() => setLoading(false))
  }, [])

  const upcoming = appointments.filter((a) => new Date(a.date) >= new Date() && a.status !== 'CANCELLED')
  const past = appointments.filter((a) => new Date(a.date) < new Date() || a.status === 'COMPLETED' || a.status === 'CANCELLED')

  if (loading) return <div className="flex justify-center pt-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
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
                {upcoming.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)}
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

function AppointmentCard({ apt }: { apt: Appointment }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-start justify-between gap-4">
      <div>
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
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[apt.status] ?? 'bg-gray-100 text-gray-600'}`}>
        {STATUS_LABEL[apt.status] ?? apt.status}
      </span>
    </div>
  )
}
