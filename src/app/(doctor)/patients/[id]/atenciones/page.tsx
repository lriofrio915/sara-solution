'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Atencion {
  id: string
  datetime: string
  service: string | null
  attentionType: string | null
  motive: string | null
  durationMins: number | null
  establishment: string | null
}

export default function AtencionesPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [atenciones, setAtenciones] = useState<Atencion[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Filters
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [tipo, setTipo] = useState('')
  const [activeFilters, setActiveFilters] = useState({ desde: '', hasta: '', tipo: '' })

  const loadAtenciones = useCallback(async (filters: { desde: string; hasta: string; tipo: string }) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.desde) params.set('desde', filters.desde)
      if (filters.hasta) params.set('hasta', filters.hasta)
      if (filters.tipo) params.set('tipo', filters.tipo)
      const res = await fetch(`/api/patients/${id}/atenciones?${params.toString()}`)
      const data = await res.json()
      setAtenciones(data.atenciones ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setAtenciones([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadAtenciones(activeFilters)
  }, [loadAtenciones, activeFilters])

  function handleSearch() {
    setActiveFilters({ desde, hasta, tipo })
  }

  function handleClearFilters() {
    setDesde('')
    setHasta('')
    setTipo('')
    setActiveFilters({ desde: '', hasta: '', tipo: '' })
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Atenciones {total > 0 && <span className="text-sm font-normal text-gray-400">({total})</span>}
        </h2>
        <button
          onClick={() => router.push(`/patients/${id}/atenciones/nueva`)}
          className="btn-primary text-sm px-4 py-2"
        >
          + Nueva atención
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">Desde</label>
            <input
              type="date"
              className="input text-sm py-1.5"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="label text-xs">Hasta</label>
            <input
              type="date"
              className="input text-sm py-1.5"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div>
            <label className="label text-xs">Tipo de servicio</label>
            <select
              className="input text-sm py-1.5"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Consulta">Consulta</option>
              <option value="Emergencia">Emergencia</option>
              <option value="Hospitalización">Hospitalización</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="btn-primary text-sm px-4 py-1.5"
            >
              Buscar
            </button>
            {(activeFilters.desde || activeFilters.hasta || activeFilters.tipo) && (
              <button
                onClick={handleClearFilters}
                className="text-sm px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-7 h-7 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : atenciones.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🩺</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No hay atenciones registradas</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Crea la primera atención con el botón &ldquo;Nueva atención&rdquo;
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Fecha / Hora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Servicio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Motivo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Duración
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {atenciones.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => router.push(`/patients/${id}/atenciones/${a.id}`)}
                      className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap">
                        <div>{new Date(a.datetime).toLocaleDateString('es-EC', { dateStyle: 'medium' })}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(a.datetime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {a.service ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                            {a.service}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {a.attentionType ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs">
                        <p className="truncate">{a.motive ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {a.durationMins ? `${a.durationMins} min` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-700">
              {atenciones.map((a) => (
                <button
                  key={a.id}
                  onClick={() => router.push(`/patients/${id}/atenciones/${a.id}`)}
                  className="w-full text-left px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {new Date(a.datetime).toLocaleDateString('es-EC', { dateStyle: 'medium' })}
                        {' · '}
                        {new Date(a.datetime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {a.motive && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{a.motive}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {a.service && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                          {a.service}
                        </span>
                      )}
                      {a.durationMins && (
                        <span className="text-xs text-gray-400">{a.durationMins} min</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
