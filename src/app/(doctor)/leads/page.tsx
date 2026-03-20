'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Download, LayoutList, Columns, Pencil, Trash2, X, Users } from 'lucide-react'

const STATUSES = ['NUEVO', 'CONTACTADO', 'AGENDADO', 'PERDIDO'] as const
const SOURCES  = ['FORMULARIO', 'CHAT', 'WHATSAPP', 'REFERIDO', 'OTRO'] as const

type PatientLead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  message: string | null
  source: string
  campaign: string | null
  status: string
  notes: string | null
  createdAt: string
}

type LeadStatus = typeof STATUSES[number]

const statusColors: Record<LeadStatus, string> = {
  NUEVO:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  CONTACTADO: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  AGENDADO:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  PERDIDO:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const sourceColors: Record<string, string> = {
  FORMULARIO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  CHAT:       'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  WHATSAPP:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REFERIDO:   'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  OTRO:       'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

const emptyForm = { name: '', email: '', phone: '', message: '', source: 'OTRO', campaign: '', status: 'NUEVO', notes: '' }

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DoctorLeadsPage() {
  const [leads, setLeads] = useState<PatientLead[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<PatientLead | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null)
  const [filters, setFilters] = useState({ search: '', status: '', source: '' })

  const loadLeads = () => {
    setLoading(true)
    fetch('/api/doctor/patient-leads')
      .then(r => r.json())
      .then(data => { setLeads(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadLeads() }, [])

  const filtered = useMemo(() => leads.filter(l => {
    const s = filters.search.toLowerCase()
    const matchSearch = !s || l.name.toLowerCase().includes(s) ||
      (l.phone?.includes(s) ?? false) || (l.email?.toLowerCase().includes(s) ?? false)
    const matchStatus = !filters.status || l.status === filters.status
    const matchSource = !filters.source || l.source === filters.source
    return matchSearch && matchStatus && matchSource
  }), [leads, filters])

  const now = new Date()
  const thisMonth = useMemo(() => leads.filter(l => {
    const d = new Date(l.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length, [leads, now])
  const agendados = leads.filter(l => l.status === 'AGENDADO').length
  const convRate  = leads.length > 0 ? ((agendados / leads.length) * 100).toFixed(1) : '0.0'

  const cards = [
    { label: 'Total leads',   value: leads.length, color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Este mes',      value: thisMonth,    color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Agendados',     value: agendados,    color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Conversión',    value: `${convRate}%`, color: 'text-teal-600 dark:text-teal-400',  bg: 'bg-teal-50 dark:bg-teal-900/20' },
  ]

  function openNew() {
    setEditing(null); setForm(emptyForm); setFormError(''); setShowModal(true)
  }

  function openEdit(lead: PatientLead) {
    setEditing(lead)
    setForm({
      name: lead.name, email: lead.email ?? '', phone: lead.phone ?? '',
      message: lead.message ?? '', source: lead.source, campaign: lead.campaign ?? '',
      status: lead.status, notes: lead.notes ?? '',
    })
    setFormError(''); setShowModal(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setFormError('El nombre es requerido'); return }
    setSaving(true)
    try {
      const url  = editing ? `/api/doctor/patient-leads/${editing.id}` : '/api/doctor/patient-leads'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { setShowModal(false); loadLeads() }
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/doctor/patient-leads/${id}`, { method: 'DELETE' })
    setConfirmDeleteId(null); loadLeads()
  }

  async function changeStatus(id: string, status: string) {
    setStatusDropdown(null)
    await fetch(`/api/doctor/patient-leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    loadLeads()
  }

  function exportCSV() {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Mensaje', 'Origen', 'Campaña', 'Estado', 'Fecha', 'Notas']
    const rows = filtered.map(l => [
      l.name, l.email ?? '', l.phone ?? '', l.message ?? '',
      l.source, l.campaign ?? '', l.status, fmtDate(l.createdAt), l.notes ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `pacientes_leads_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads de pacientes</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Pacientes interesados captados desde tu página pública
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`${c.bg} rounded-2xl p-4`}>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-300">{c.label}</p>
            <p className={`text-3xl font-bold mt-1 ${c.color}`}>{loading ? '—' : c.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Buscar paciente..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={filters.source}
          onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Todos los orígenes</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <LayoutList size={15} /> Tabla
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${viewMode === 'kanban' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <Columns size={15} /> Kanban
          </button>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Download size={15} /> Exportar CSV
        </button>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Nuevo lead
        </button>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  {['Nombre', 'Teléfono', 'Email', 'Mensaje', 'Origen', 'Estado', 'Fecha', 'Notas', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 dark:text-slate-300">
                        {leads.length === 0
                          ? 'Aún no tienes leads. Serán captados automáticamente desde tu página pública.'
                          : 'No se encontraron leads con ese filtro'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(lead => (
                    <tr key={lead.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{lead.name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-300">{lead.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-300 text-xs">{lead.email ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-300 text-xs max-w-[140px] truncate" title={lead.message ?? ''}>
                        {lead.message ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${sourceColors[lead.source] ?? sourceColors.OTRO}`}>
                          {lead.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setStatusDropdown(statusDropdown === lead.id ? null : lead.id)}
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${statusColors[lead.status as LeadStatus] ?? statusColors.NUEVO}`}
                          >
                            {lead.status}
                          </button>
                          {statusDropdown === lead.id && (
                            <div className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-20">
                              {STATUSES.map(s => (
                                <button key={s} onClick={() => changeStatus(lead.id, s)}
                                  className="flex items-center w-full px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                  <span className={`w-2 h-2 rounded-full mr-2 ${s === 'NUEVO' ? 'bg-blue-500' : s === 'CONTACTADO' ? 'bg-yellow-500' : s === 'AGENDADO' ? 'bg-green-500' : 'bg-red-500'}`} />
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 dark:text-slate-400 text-xs whitespace-nowrap">{fmtDate(lead.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-300 text-xs max-w-[100px] truncate">{lead.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(lead)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setConfirmDeleteId(lead.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STATUSES.map(status => {
              const col = filtered.filter(l => l.status === status)
              return (
                <div key={status} className="w-64 flex-shrink-0">
                  <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-xl ${statusColors[status]}`}>
                    <span className="font-semibold text-sm">{status}</span>
                    <span className="text-xs font-bold bg-white/30 dark:bg-black/20 rounded-full px-2 py-0.5">{col.length}</span>
                  </div>
                  <div className="space-y-3">
                    {col.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-xs border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        Sin leads
                      </div>
                    ) : col.map(lead => (
                      <div key={lead.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{lead.name}</p>
                        {lead.phone && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{lead.phone}</p>}
                        {lead.message && (
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 line-clamp-2">{lead.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-md text-xs font-medium ${sourceColors[lead.source] ?? sourceColors.OTRO}`}>
                            {lead.source}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-slate-400 mt-1.5">{fmtDate(lead.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">
                {editing ? 'Editar lead' : 'Nuevo lead'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ana García"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+593..."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@ejemplo.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Motivo de consulta..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origen</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notas internas..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
            <Trash2 size={36} className="mx-auto text-red-500 mb-3" />
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">¿Eliminar lead?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-300 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
