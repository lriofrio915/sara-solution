'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MedicalLoadingScreen from '@/components/MedicalLoadingScreen'

interface Diagnosis {
  cie10Code?: string
  cie10Desc?: string
}

interface Attention {
  id: string
  datetime: string
  service: string | null
  attentionType: string | null
  motive: string | null
  diagnoses: Diagnosis[] | null
  durationMins: number | null
  patient: { id: string; name: string; documentId: string | null }
}

const PAGE_SIZE = 50

export default function AtencionesPage() {
  const router = useRouter()
  const [items, setItems] = useState<Attention[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (search.trim()) params.set('q', search.trim())
      if (tipo) params.set('tipo', tipo)
      const res = await fetch(`/api/atenciones?${params}`)
      const data = await res.json()
      setItems(data.atenciones ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, search, tipo])

  // Debounce de la búsqueda para no disparar una query por tecla
  useEffect(() => {
    const t = setTimeout(fetchData, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchData, search])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function diagnosisText(a: Attention): string {
    if (!Array.isArray(a.diagnoses) || a.diagnoses.length === 0) return ''
    const first = a.diagnoses[0]
    const label = first?.cie10Desc ?? first?.cie10Code ?? ''
    if (!label) return ''
    return a.diagnoses.length > 1 ? `${label} +${a.diagnoses.length - 1} más` : label
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Atenciones</h1>
          <p className="text-gray-500 dark:text-slate-300 text-sm mt-0.5">
            {total > 0
              ? `${total} atención${total !== 1 ? 'es' : ''} registrada${total !== 1 ? 's' : ''}`
              : 'Historial de consultas de todos los pacientes'}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por paciente o cédula…"
          className="flex-1 min-w-[240px] px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={tipo}
          onChange={(e) => { setTipo(e.target.value); setPage(1) }}
          className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Todos los servicios</option>
          <option value="Consulta">Consulta</option>
          <option value="Emergencia">Emergencia</option>
          <option value="Hospitalización">Hospitalización</option>
        </select>
      </div>

      {loading && <MedicalLoadingScreen label="Cargando atenciones…" />}

      {!loading && items.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <p className="text-5xl mb-4">🩺</p>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {search || tipo ? 'Sin resultados' : 'No hay atenciones aún'}
          </h3>
          <p className="text-gray-500 dark:text-slate-300">
            {search || tipo
              ? 'Prueba con otro término de búsqueda o cambia el filtro.'
              : 'Las atenciones se registran desde la ficha del paciente.'}
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="hidden md:grid grid-cols-[auto_1fr_auto_1fr_1fr_auto] gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wide">
            <span>Fecha</span>
            <span>Paciente</span>
            <span>Servicio</span>
            <span>Motivo</span>
            <span>Diagnóstico</span>
            <span />
          </div>
          {items.map((item, i) => (
            <div key={item.id}
              className={`flex flex-col md:grid md:grid-cols-[auto_1fr_auto_1fr_1fr_auto] gap-2 md:gap-4 px-6 py-4 items-start md:items-center ${
                i < items.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''
              } hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors`}>
              <div className="text-sm text-gray-500 dark:text-slate-300 whitespace-nowrap">
                {new Date(item.datetime).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.patient.name}</p>
                {item.patient.documentId && <p className="text-xs text-gray-400">{item.patient.documentId}</p>}
              </div>
              <div>
                {item.service ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    {item.service}
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {item.motive || <span className="text-gray-300 dark:text-gray-600">—</span>}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {diagnosisText(item) || <span className="text-gray-300 dark:text-gray-600">—</span>}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => router.push(`/patients/${item.patient.id}/atenciones/${item.id}`)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-primary hover:bg-primary/5 transition-colors whitespace-nowrap">
                  Ver Atención
                </button>
                <button
                  onClick={() => router.push(`/patients/${item.patient.id}/ficha`)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap">
                  Ver Paciente
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Anterior
          </button>
          <span className="text-sm text-gray-500 dark:text-slate-300">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
