'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Users, Search, ExternalLink, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import type { AdminDoctor } from '@/types'

const PAGE_SIZE = 10

const planBadge: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  BASIC: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PRO: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  ENTERPRISE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-600',
}

const PLANS = ['FREE', 'TRIAL', 'BASIC', 'PRO', 'ENTERPRISE']

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<AdminDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('TODOS')
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<AdminDoctor | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/doctors')
      .then(r => r.json())
      .then(data => { setDoctors(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return doctors.filter(d => {
      const matchSearch =
        !search ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.email.toLowerCase().includes(search.toLowerCase())
      const matchPlan =
        planFilter === 'TODOS' ||
        (planFilter === 'FREE' ? (!d.plan || d.plan === 'FREE') : d.plan === planFilter)
      return matchSearch && matchPlan
    })
  }, [doctors, search, planFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const counts = useMemo(() => ({
    total: doctors.length,
    free: doctors.filter(d => !d.plan || d.plan === 'FREE').length,
    pro: doctors.filter(d => d.plan === 'PRO').length,
    enterprise: doctors.filter(d => d.plan === 'ENTERPRISE').length,
  }), [doctors])

  const cards = [
    { label: 'Total Médicos', value: counts.total, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Plan Free', value: counts.free, color: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-700/40' },
    { label: 'Plan Pro', value: counts.pro, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Plan Enterprise', value: counts.enterprise, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  ]

  async function handleDelete(doctor: AdminDoctor) {
    setDeletingId(doctor.id)
    try {
      const res = await fetch(`/api/admin/doctors/${doctor.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDoctors(prev => prev.filter(d => d.id !== doctor.id))
        setConfirmDelete(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function handlePlanChange(doctorId: string, newPlan: string) {
    setUpdatingPlanId(doctorId)
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      })
      if (res.ok) {
        setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, plan: newPlan } : d))
      }
    } finally {
      setUpdatingPlanId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`${c.bg} rounded-2xl p-4`}>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-300">{c.label}</p>
            <p className={`text-3xl font-bold mt-1 ${c.color}`}>{loading ? '—' : c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1) }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="TODOS">Todos los planes</option>
          <option value="FREE">Free</option>
          <option value="BASIC">Basic</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-10">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Médico</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Especialidad</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden lg:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Plan</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden sm:table-cell">Pacientes</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden xl:table-cell">Registro</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-slate-300">No se encontraron médicos</p>
                  </td>
                </tr>
              ) : (
                paginated.map((doc, idx) => {
                  const rowNum = (page - 1) * PAGE_SIZE + idx + 1
                  const plan = doc.plan ?? 'FREE'
                  const isUpdatingPlan = updatingPlanId === doc.id
                  return (
                    <tr key={doc.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-gray-400 dark:text-slate-400">{rowNum}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {doc.avatarUrl ? (
                            <Image src={doc.avatarUrl} alt={doc.name} width={36} height={36}
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                              {getInitials(doc.name)}
                            </div>
                          )}
                          <span className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 hidden md:table-cell">{doc.specialty}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-300 hidden lg:table-cell text-xs">{doc.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={plan}
                          disabled={isUpdatingPlan}
                          onChange={e => handlePlanChange(doc.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-wait ${planBadge[plan] ?? planBadge.FREE}`}
                        >
                          {PLANS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium hidden sm:table-cell">
                        {doc._count.patients}
                      </td>
                      <td className="px-4 py-3 text-gray-400 dark:text-slate-400 text-xs hidden xl:table-cell">
                        {new Date(doc.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {doc.slug && (
                            <a
                              href={`/${doc.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              <ExternalLink size={12} />
                              Ver perfil
                            </a>
                          )}
                          <button
                            onClick={() => setConfirmDelete(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          >
                            <Trash2 size={12} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
            <p className="text-xs text-gray-500 dark:text-slate-300">
              Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} médicos
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium px-1">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
              <Trash2 size={22} className="text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white text-center">Eliminar médico</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-300 text-center">
              ¿Seguro que deseas eliminar a <span className="font-semibold text-gray-800 dark:text-white">{confirmDelete.name}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-wait transition-colors"
              >
                {deletingId === confirmDelete.id ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
