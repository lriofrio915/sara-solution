'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Patient {
  id: string
  name: string
  email: string | null
  phone: string | null
  birthDate: string | null
  bloodType: string
  documentId: string | null
  createdAt: string
  _count: { appointments: number }
}

function calcAge(birthDate: string | null): string {
  if (!birthDate) return '—'
  const diff = Date.now() - new Date(birthDate).getTime()
  const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
  return `${age} años`
}

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [debouncedQ, setDebouncedQ] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const fetchPatients = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}&limit=50`)
      const data = await res.json()
      setPatients(data.patients ?? [])
      setTotal(data.total ?? 0)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatients(debouncedQ)
  }, [debouncedQ, fetchPatients])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPatients((prev) => prev.filter((p) => p.id !== id))
        setTotal((prev) => prev - 1)
      }
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pacientes</h1>
          <p className="text-gray-500 dark:text-slate-300 mt-0.5 text-sm">
            {total > 0 ? `${total} paciente${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}` : 'Gestión de tu base de pacientes'}
          </p>
        </div>
        <Link href="/patients/new" className="btn-primary flex-shrink-0">
          + Nuevo paciente
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, cédula, teléfono o email..."
            className="input pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && patients.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <p className="text-5xl mb-4">👥</p>
          {debouncedQ ? (
            <>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sin resultados</h3>
              <p className="text-gray-500 dark:text-slate-400">No encontramos pacientes con &ldquo;{debouncedQ}&rdquo;</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No hay pacientes aún</h3>
              <p className="text-gray-500 dark:text-slate-400 mb-6">Comienza agregando tu primer paciente o pídele a Sara que te ayude.</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/patients/new" className="btn-primary">Agregar paciente</Link>
                <Link href="/sara" className="btn-outline">Pedir a Sara</Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Patient list */}
      {!loading && patients.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Paciente</span>
            <span>Contacto</span>
            <span>Documento / Sangre</span>
            <span className="text-center">Citas</span>
            <span />
          </div>

          {patients.map((p, i) => (
            <div key={p.id}
              onClick={() => router.push(`/patients/${p.id}`)}
              className={`flex flex-col md:grid md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 md:gap-4 px-6 py-4 items-start md:items-center cursor-pointer ${
                i < patients.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''
              } hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors`}>

              {/* Name + age */}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">{calcAge(p.birthDate)}</p>
              </div>

              {/* Contact */}
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {p.phone && <p>{p.phone}</p>}
                {p.email && <p className="text-xs text-gray-400 truncate max-w-[180px]">{p.email}</p>}
                {!p.phone && !p.email && <p className="text-gray-300 text-xs">Sin contacto</p>}
              </div>

              {/* Doc + blood */}
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {p.documentId && <p className="text-xs font-mono">{p.documentId}</p>}
                {p.bloodType && p.bloodType !== 'UNKNOWN' && (
                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
                    {p.bloodType.replace('_', '')}
                  </span>
                )}
              </div>

              {/* Appointment count */}
              <div className="text-center">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {p._count.appointments}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {confirmDeleteId === p.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500 dark:text-slate-300 mr-1">¿Eliminar?</span>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                      {deletingId === p.id ? '...' : 'Sí'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      No
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      href={`/patients/${p.id}`}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
                      Ver
                    </Link>
                    <button
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors">
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ask Sara hint */}
      {!loading && total > 0 && (
        <div className="mt-4 flex justify-end">
          <Link href="/sara"
            className="text-sm text-gray-400 hover:text-primary transition-colors flex items-center gap-1.5">
            <span>✨</span> Pedir a Sara que registre un paciente
          </Link>
        </div>
      )}
    </div>
  )
}
