'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Appointment {
  id: string
  date: string
  type: string
  status: string
  reason: string | null
}

interface Prescription {
  id: string
  date: string
  diagnosis: string | null
  medications: unknown
}

interface Summary {
  upcomingAppointments: Appointment[]
  recentPrescriptions: Prescription[]
  totalExamOrders: number
  totalCertificates: number
}

const TYPE_LABEL: Record<string, string> = {
  IN_PERSON: 'Presencial', TELECONSULT: 'Teleconsulta', HOME_VISIT: 'Domicilio',
  EMERGENCY: 'Urgencia', FOLLOW_UP: 'Seguimiento',
}
const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700', CONFIRMED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600', CANCELLED: 'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Programada', CONFIRMED: 'Confirmada', COMPLETED: 'Completada', CANCELLED: 'Cancelada',
}

export default function PatientDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [patientName, setPatientName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/patient/me').then((r) => r.json()),
      fetch('/api/patient/me/summary').then((r) => r.json()),
    ]).then(([me, sum]) => {
      setPatientName(me.name?.split(' ')[0] ?? '')
      setSummary(sum)
    }).finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}, {patientName} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Tu resumen de salud</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/mi-salud/citas"
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-lg mb-3">📅</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary?.upcomingAppointments.length ?? 0}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Citas próximas</p>
        </Link>
        <Link href="/mi-salud/recetas"
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-lg mb-3">💊</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary?.recentPrescriptions.length ?? 0}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Recetas recientes</p>
        </Link>
        <Link href="/mi-salud/examenes"
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-lg mb-3">🔬</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary?.totalExamOrders ?? 0}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Órdenes de examen</p>
        </Link>
        <Link href="/mi-salud/certificados"
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-lg mb-3">📋</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary?.totalCertificates ?? 0}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Certificados</p>
        </Link>
      </div>

      {/* Upcoming appointments */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white">Próximas citas</h2>
          <Link href="/mi-salud/citas" className="text-xs text-primary hover:underline">Ver todas →</Link>
        </div>
        {!summary?.upcomingAppointments.length ? (
          <p className="text-sm text-gray-400 text-center py-4">No tienes citas próximas programadas</p>
        ) : (
          <div className="space-y-3">
            {summary.upcomingAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(apt.date).toLocaleDateString('es-EC', { dateStyle: 'medium' })}
                    {' · '}
                    {new Date(apt.date).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {TYPE_LABEL[apt.type] ?? apt.type}{apt.reason ? ` · ${apt.reason}` : ''}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[apt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABEL[apt.status] ?? apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent prescriptions */}
      {!!summary?.recentPrescriptions.length && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white">Recetas recientes</h2>
            <Link href="/mi-salud/recetas" className="text-xs text-primary hover:underline">Ver todas →</Link>
          </div>
          <div className="space-y-3">
            {summary.recentPrescriptions.map((rx) => (
              <div key={rx.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(rx.date).toLocaleDateString('es-EC', { dateStyle: 'medium' })}
                  </p>
                  {rx.diagnosis && <p className="text-xs text-gray-400 mt-0.5">{rx.diagnosis}</p>}
                </div>
                <Link href="/mi-salud/recetas" className="text-xs text-primary hover:underline flex-shrink-0">
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
