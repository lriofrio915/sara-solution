import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Citas' }

export default function AppointmentsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
          <p className="text-gray-500 mt-1">Agenda y gestión de citas médicas</p>
        </div>
        <Link href="/appointments/new" className="btn-primary">
          📅 Nueva Cita
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        {['Todas', 'Hoy', 'Esta semana', 'Este mes'].map((f) => (
          <button
            key={f}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors first:bg-primary first:text-white first:border-primary"
          >
            {f}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
        <p className="text-5xl mb-4">📅</p>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No hay citas programadas</h3>
        <p className="text-gray-500 mb-6">Crea tu primera cita o pídele a Sara que te ayude a agendar.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/appointments/new" className="btn-primary">
            Agendar cita
          </Link>
          <Link href="/sara" className="btn-outline">
            🤖 Pedir a Sara
          </Link>
        </div>
      </div>
    </div>
  )
}
