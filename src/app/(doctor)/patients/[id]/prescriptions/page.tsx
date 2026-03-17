'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Medication {
  name: string
  dose?: string
  frequency?: string
  duration?: string
  notes?: string
}

interface Prescription {
  id: string
  date: string
  diagnosis: string | null
  medications: Medication[]
  instructions: string | null
  rxNumber?: string | null
}

const EMPTY_MED: Medication = { name: '', dose: '', frequency: '', duration: '', notes: '' }

function EditModal({ rx, onClose, onSaved }: {
  rx: Prescription
  onClose: () => void
  onSaved: (updated: Prescription) => void
}) {
  const [date, setDate] = useState(rx.date.slice(0, 10))
  const [diagnosis, setDiagnosis] = useState(rx.diagnosis ?? '')
  const [medications, setMedications] = useState<Medication[]>(
    rx.medications.length > 0 ? rx.medications : [{ ...EMPTY_MED }]
  )
  const [instructions, setInstructions] = useState(rx.instructions ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateMed(i: number, field: keyof Medication, value: string) {
    setMedications((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }
  function addMed() { setMedications((prev) => [...prev, { ...EMPTY_MED }]) }
  function removeMed(i: number) { setMedications((prev) => prev.filter((_, idx) => idx !== i)) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/prescriptions/${rx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          diagnosis: diagnosis || null,
          medications: medications.filter((m) => m.name.trim()),
          instructions: instructions || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar')
      }
      const data = await res.json()
      onSaved(data.prescription)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Editar receta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diagnóstico</label>
              <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Opcional"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Medicamentos</label>
              <button type="button" onClick={addMed}
                className="text-xs font-semibold text-primary hover:underline">+ Agregar</button>
            </div>
            <div className="space-y-3">
              {medications.map((med, i) => (
                <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 space-y-2 relative">
                  {medications.length > 1 && (
                    <button type="button" onClick={() => removeMed(i)}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-400 text-sm">✕</button>
                  )}
                  <input type="text" value={med.name} onChange={(e) => updateMed(i, 'name', e.target.value)}
                    placeholder="Medicamento *"
                    className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={med.dose ?? ''} onChange={(e) => updateMed(i, 'dose', e.target.value)}
                      placeholder="Dosis"
                      className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
                    <input type="text" value={med.frequency ?? ''} onChange={(e) => updateMed(i, 'frequency', e.target.value)}
                      placeholder="Frecuencia"
                      className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
                    <input type="text" value={med.duration ?? ''} onChange={(e) => updateMed(i, 'duration', e.target.value)}
                      placeholder="Duración"
                      className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
                  </div>
                  <input type="text" value={med.notes ?? ''} onChange={(e) => updateMed(i, 'notes', e.target.value)}
                    placeholder="Notas adicionales"
                    className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Indicaciones para el paciente</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="Instrucciones de uso, signos de alarma..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PatientPrescriptionsPage() {
  const { id } = useParams<{ id: string }>()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [editingRx, setEditingRx] = useState<Prescription | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingRxId, setViewingRxId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/prescriptions?patientId=${id}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setPrescriptions(data.prescriptions ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDelete(rxId: string) {
    setDeletingId(rxId)
    try {
      const res = await fetch(`/api/prescriptions/${rxId}`, { method: 'DELETE' })
      if (res.ok) {
        setPrescriptions((prev) => prev.filter((rx) => rx.id !== rxId))
        setTotal((prev) => prev - 1)
      }
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  function handleSaved(updated: Prescription) {
    setPrescriptions((prev) => prev.map((rx) => rx.id === updated.id ? { ...rx, ...updated } : rx))
    setEditingRx(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (prescriptions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
        <p className="text-4xl mb-4">💊</p>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sin recetas registradas</h3>
        <p className="text-gray-500 dark:text-slate-300 mb-6">
          Las recetas emitidas aparecerán aquí automáticamente.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href={`/patients/${id}/atenciones/nueva`} className="btn-primary">
            Nueva atención
          </Link>
          <Link href={`/prescriptions/new?patientId=${id}`} className="btn-outline">
            Receta manual
          </Link>
        </div>
      </div>
    )
  }

  // Inline PDF viewer
  if (viewingRxId) {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setViewingRxId(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
          >
            ← Volver a recetas
          </button>
        </div>
        <iframe
          src={`/prescriptions/${viewingRxId}/imprimir`}
          className="flex-1 w-full rounded-2xl border border-gray-200 dark:border-gray-700"
          style={{ minHeight: '600px' }}
        />
      </div>
    )
  }

  return (
    <>
      {editingRx && (
        <EditModal
          rx={editingRx}
          onClose={() => setEditingRx(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-300">
            {total} receta{total !== 1 ? 's' : ''} en total
          </p>
          <Link href={`/prescriptions/new?patientId=${id}`} className="btn-primary text-sm py-1.5">
            + Nueva receta
          </Link>
        </div>

        {prescriptions.map((rx) => {
          const meds = Array.isArray(rx.medications) ? rx.medications : []
          return (
            <div
              key={rx.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
              onClick={() => setViewingRxId(rx.id)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {rx.rxNumber && (
                      <span className="text-xs font-mono font-bold text-primary">{rx.rxNumber}</span>
                    )}
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Date(rx.date).toLocaleDateString('es-EC', {
                        timeZone: 'America/Guayaquil',
                        dateStyle: 'long',
                      })}
                    </p>
                  </div>
                  {rx.diagnosis && (
                    <p className="text-xs text-gray-500 dark:text-slate-300 mt-0.5">{rx.diagnosis}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/prescriptions/${rx.id}/imprimir`}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors"
                  >
                    🖨️ Imprimir
                  </Link>
                  <button
                    onClick={() => setEditingRx(rx)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  >
                    ✏️ Editar
                  </button>
                  {confirmDeleteId === rx.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 dark:text-slate-300">¿Eliminar?</span>
                      <button
                        onClick={() => handleDelete(rx.id)}
                        disabled={deletingId === rx.id}
                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === rx.id ? '...' : 'Sí'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(rx.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {meds.map((med, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <span className="text-purple-400 mt-0.5 flex-shrink-0">💊</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{med.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-300">
                        {[med.dose, med.frequency, med.duration].filter(Boolean).join(' · ')}
                      </p>
                      {med.notes && <p className="text-xs text-gray-400 italic mt-0.5">{med.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {rx.instructions && (
                <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Indicaciones</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line line-clamp-3">{rx.instructions}</p>
                </div>
              )}

              <p className="mt-3 text-xs text-primary/60 text-right">Clic para ver receta →</p>
            </div>
          )
        })}
      </div>
    </>
  )
}
