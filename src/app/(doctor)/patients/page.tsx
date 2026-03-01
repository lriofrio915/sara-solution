import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Pacientes' }

export default function PatientsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-500 mt-1">Gestión de tu base de pacientes</p>
        </div>
        <Link href="/patients/new" className="btn-primary">
          ➕ Nuevo Paciente
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <input
          type="search"
          placeholder="Buscar paciente por nombre, cédula o teléfono..."
          className="input"
        />
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
        <p className="text-5xl mb-4">👥</p>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No hay pacientes aún</h3>
        <p className="text-gray-500 mb-6">Comienza agregando tu primer paciente o pídele a Sara que te ayude.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/patients/new" className="btn-primary">
            Agregar paciente
          </Link>
          <Link href="/sara" className="btn-outline">
            🤖 Pedir a Sara
          </Link>
        </div>
      </div>
    </div>
  )
}
