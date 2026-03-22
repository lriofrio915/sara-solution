'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import LineChart from '@/components/charts/LineChart'

// ─── PAI Ecuador – Esquema de vacunación ─────────────────────────────────────

interface VaccineScheduleItem {
  id: string
  vaccine: string
  description: string
  scheduledAgeMonths: number
  scheduledLabel: string
  dose: string
}

const PAI_SCHEDULE: VaccineScheduleItem[] = [
  { id: 'bcg',       vaccine: 'BCG',           description: 'Tuberculosis',             scheduledAgeMonths: 0,  scheduledLabel: 'Al nacimiento', dose: '1ra dosis' },
  { id: 'hb0',       vaccine: 'Hepatitis B',   description: 'Hepatitis B',              scheduledAgeMonths: 0,  scheduledLabel: 'Al nacimiento', dose: '1ra dosis' },
  { id: 'penta1',    vaccine: 'Pentavalente',  description: 'DPT + HB + Hib',          scheduledAgeMonths: 2,  scheduledLabel: '2 meses',       dose: '1ra dosis' },
  { id: 'opv1',      vaccine: 'Polio OPV',     description: 'Poliomielitis',            scheduledAgeMonths: 2,  scheduledLabel: '2 meses',       dose: '1ra dosis' },
  { id: 'rota1',     vaccine: 'Rotavirus',     description: 'Rotavirus',               scheduledAgeMonths: 2,  scheduledLabel: '2 meses',       dose: '1ra dosis' },
  { id: 'neum1',     vaccine: 'Neumococo',     description: 'Neumococo conjugado',     scheduledAgeMonths: 2,  scheduledLabel: '2 meses',       dose: '1ra dosis' },
  { id: 'penta2',    vaccine: 'Pentavalente',  description: 'DPT + HB + Hib',          scheduledAgeMonths: 4,  scheduledLabel: '4 meses',       dose: '2da dosis' },
  { id: 'opv2',      vaccine: 'Polio OPV',     description: 'Poliomielitis',            scheduledAgeMonths: 4,  scheduledLabel: '4 meses',       dose: '2da dosis' },
  { id: 'rota2',     vaccine: 'Rotavirus',     description: 'Rotavirus',               scheduledAgeMonths: 4,  scheduledLabel: '4 meses',       dose: '2da dosis' },
  { id: 'neum2',     vaccine: 'Neumococo',     description: 'Neumococo conjugado',     scheduledAgeMonths: 4,  scheduledLabel: '4 meses',       dose: '2da dosis' },
  { id: 'penta3',    vaccine: 'Pentavalente',  description: 'DPT + HB + Hib',          scheduledAgeMonths: 6,  scheduledLabel: '6 meses',       dose: '3ra dosis' },
  { id: 'opv3',      vaccine: 'Polio OPV',     description: 'Poliomielitis',            scheduledAgeMonths: 6,  scheduledLabel: '6 meses',       dose: '3ra dosis' },
  { id: 'srp1',      vaccine: 'SRP',           description: 'Sarampión, Rubéola, Paperas', scheduledAgeMonths: 12, scheduledLabel: '12 meses',  dose: '1ra dosis' },
  { id: 'var1',      vaccine: 'Varicela',      description: 'Varicela',                scheduledAgeMonths: 12, scheduledLabel: '12 meses',      dose: '1ra dosis' },
  { id: 'neum_ref',  vaccine: 'Neumococo',     description: 'Neumococo conjugado',     scheduledAgeMonths: 12, scheduledLabel: '12 meses',      dose: 'Refuerzo'  },
  { id: 'hepa1',     vaccine: 'Hepatitis A',   description: 'Hepatitis A',              scheduledAgeMonths: 12, scheduledLabel: '12 meses',      dose: '1ra dosis' },
  { id: 'hepa2',     vaccine: 'Hepatitis A',   description: 'Hepatitis A',              scheduledAgeMonths: 18, scheduledLabel: '18 meses',      dose: '2da dosis' },
  { id: 'penta_ref', vaccine: 'Pentavalente',  description: 'DPT + HB + Hib',          scheduledAgeMonths: 18, scheduledLabel: '18 meses',      dose: 'Refuerzo'  },
  { id: 'opv_ref',   vaccine: 'Polio OPV',     description: 'Poliomielitis',            scheduledAgeMonths: 18, scheduledLabel: '18 meses',      dose: 'Refuerzo'  },
  { id: 'fa',        vaccine: 'Fiebre Amarilla', description: 'Fiebre Amarilla',        scheduledAgeMonths: 24, scheduledLabel: '2 años',        dose: '1ra dosis' },
  { id: 'dpt_ref',   vaccine: 'DPT',           description: 'Difteria, Tos Ferina, Tétanos', scheduledAgeMonths: 60, scheduledLabel: '5 años',  dose: 'Refuerzo'  },
  { id: 'opv_ref2',  vaccine: 'Polio OPV',     description: 'Poliomielitis',            scheduledAgeMonths: 60, scheduledLabel: '5 años',        dose: 'Refuerzo'  },
  { id: 'srp2',      vaccine: 'SRP',           description: 'Sarampión, Rubéola, Paperas', scheduledAgeMonths: 60, scheduledLabel: '5 años',    dose: '2da dosis' },
  { id: 'var2',      vaccine: 'Varicela',      description: 'Varicela',                scheduledAgeMonths: 60, scheduledLabel: '5 años',        dose: '2da dosis' },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface VaccineRecord {
  id: string
  appliedDate: string
  lot: string
  notes: string
}

interface GrowthRecord {
  date: string
  ageMonths: number
  weight: number | null
  height: number | null
  headCirc: number | null
}

interface PregnancyControl {
  date: string
  week: number | null
  weight: number | null
  bp: string
  fuAltura: number | null
  notes: string
}

interface PregnancyData {
  fum: string
  fpp: string
  method: string
  controls: PregnancyControl[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function calcFPP(fum: string): string {
  const d = addDays(new Date(fum), 280)
  return d.toISOString().slice(0, 10)
}

function calcGestationalAge(fum: string): { weeks: number; days: number } {
  const diff = Date.now() - new Date(fum).getTime()
  const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24))
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7 }
}

function calcAgeMonths(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function getTrimester(weeks: number): { label: string; color: string } {
  if (weeks <= 13) return { label: '1er Trimestre', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
  if (weeks <= 26) return { label: '2do Trimestre', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
  if (weeks <= 40) return { label: '3er Trimestre', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' }
  return { label: 'Término', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
}

// ─── Section: Vacunas ────────────────────────────────────────────────────────

function VacunasSection({
  birthDate,
  records,
  onChange,
}: {
  birthDate: string | null
  records: VaccineRecord[]
  onChange: (r: VaccineRecord[]) => void
}) {
  const ageMonths = birthDate ? calcAgeMonths(birthDate) : null
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<VaccineRecord>({ id: '', appliedDate: '', lot: '', notes: '' })

  function getRecord(id: string): VaccineRecord | undefined {
    return records.find((r) => r.id === id)
  }

  function getStatus(item: VaccineScheduleItem): 'applied' | 'due' | 'upcoming' | 'overdue' {
    const rec = getRecord(item.id)
    if (rec?.appliedDate) return 'applied'
    if (ageMonths === null) return 'upcoming'
    if (ageMonths >= item.scheduledAgeMonths + 3) return 'overdue'
    if (ageMonths >= item.scheduledAgeMonths) return 'due'
    return 'upcoming'
  }

  function startEdit(id: string) {
    const existing = getRecord(id)
    setForm(existing ?? { id, appliedDate: new Date().toISOString().slice(0, 10), lot: '', notes: '' })
    setEditingId(id)
  }

  function saveRecord() {
    if (!editingId) return
    const updated = records.filter((r) => r.id !== editingId)
    if (form.appliedDate) updated.push({ ...form, id: editingId })
    onChange(updated)
    setEditingId(null)
  }

  function clearRecord(id: string) {
    onChange(records.filter((r) => r.id !== id))
  }

  const grouped = PAI_SCHEDULE.reduce<Record<string, VaccineScheduleItem[]>>((acc, item) => {
    const key = item.scheduledLabel
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const stats = {
    applied: PAI_SCHEDULE.filter((i) => getRecord(i.id)?.appliedDate).length,
    total: PAI_SCHEDULE.length,
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">Aplicada ({stats.applied}/{stats.total})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">Pendiente (edad)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">Atrasada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span className="text-sm text-gray-600 dark:text-gray-300">Próxima</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${(stats.applied / stats.total) * 100}%` }}
        />
      </div>

      {/* Groups by age */}
      {Object.entries(grouped).map(([ageLabel, items]) => (
        <div key={ageLabel} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{ageLabel}</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {items.map((item) => {
              const status = getStatus(item)
              const rec = getRecord(item.id)
              const statusConfig = {
                applied:  { dot: 'bg-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Aplicada' },
                due:      { dot: 'bg-blue-500',  badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',    label: 'Pendiente' },
                overdue:  { dot: 'bg-red-500',   badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',       label: 'Atrasada' },
                upcoming: { dot: 'bg-gray-300',  badge: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',      label: 'Próxima' },
              }[status]

              return (
                <div key={item.id}>
                  <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusConfig.dot}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {item.vaccine} <span className="font-normal text-gray-400">— {item.dose}</span>
                        </p>
                        <p className="text-xs text-gray-400">{item.description}</p>
                        {rec?.appliedDate && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                            Aplicada: {new Date(rec.appliedDate).toLocaleDateString('es-EC', { dateStyle: 'medium' })}
                            {rec.lot && ` · Lote: ${rec.lot}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.badge}`}>
                        {statusConfig.label}
                      </span>
                      <button
                        onClick={() => startEdit(item.id)}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {rec?.appliedDate ? 'Editar' : 'Registrar'}
                      </button>
                      {rec?.appliedDate && (
                        <button
                          onClick={() => clearRecord(item.id)}
                          className="text-xs px-2 py-1 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {editingId === item.id && (
                    <div className="px-4 pb-4 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-800">
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">Fecha de aplicación</label>
                          <input
                            type="date"
                            className="input text-sm"
                            value={form.appliedDate}
                            onChange={(e) => setForm((f) => ({ ...f, appliedDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">Lote (opcional)</label>
                          <input
                            className="input text-sm"
                            placeholder="Nro. de lote"
                            value={form.lot}
                            onChange={(e) => setForm((f) => ({ ...f, lot: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="label text-xs">Notas (opcional)</label>
                          <input
                            className="input text-sm"
                            placeholder="Observaciones..."
                            value={form.notes}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={saveRecord} className="btn-primary text-xs px-3 py-1.5">Guardar</button>
                        <button onClick={() => setEditingId(null)} className="btn-outline text-xs px-3 py-1.5">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Section: Crecimiento ────────────────────────────────────────────────────

function CrecimientoSection({
  birthDate,
  records,
  onChange,
}: {
  birthDate: string | null
  records: GrowthRecord[]
  onChange: (r: GrowthRecord[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Omit<GrowthRecord, 'ageMonths'>>({
    date: new Date().toISOString().slice(0, 10),
    weight: null,
    height: null,
    headCirc: null,
  })
  const [editingIdx, setEditingIdx] = useState<number | null>(null)

  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  function calcAgeAtDate(dateStr: string): number {
    if (!birthDate) return 0
    const birth = new Date(birthDate)
    const d = new Date(dateStr)
    return Math.round((d.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  }

  function handleAdd() {
    const rec: GrowthRecord = {
      ...form,
      ageMonths: calcAgeAtDate(form.date),
      weight: form.weight ? Number(form.weight) : null,
      height: form.height ? Number(form.height) : null,
      headCirc: form.headCirc ? Number(form.headCirc) : null,
    }
    if (editingIdx !== null) {
      const updated = [...records]
      updated[editingIdx] = rec
      onChange(updated)
      setEditingIdx(null)
    } else {
      onChange([...records, rec])
    }
    setForm({ date: new Date().toISOString().slice(0, 10), weight: null, height: null, headCirc: null })
    setAdding(false)
  }

  function handleEdit(idx: number) {
    const original = records[idx]
    setForm({
      date: original.date,
      weight: original.weight,
      height: original.height,
      headCirc: original.headCirc,
    })
    setEditingIdx(idx)
    setAdding(true)
  }

  function handleDelete(idx: number) {
    onChange(records.filter((_, i) => i !== idx))
  }

  const weightData = sorted
    .filter((r) => r.weight !== null)
    .map((r) => ({ label: `${r.ageMonths}m`, value: Number(r.weight) }))

  const heightData = sorted
    .filter((r) => r.height !== null)
    .map((r) => ({ label: `${r.ageMonths}m`, value: Number(r.height) }))

  return (
    <div className="space-y-5">
      {/* Charts */}
      {weightData.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Peso (kg)</p>
            <LineChart data={weightData} color="#0D9488" />
          </div>
          {heightData.length >= 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Talla (cm)</p>
              <LineChart data={heightData} color="#2563EB" />
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mediciones registradas</p>
          <button
            onClick={() => { setAdding(true); setEditingIdx(null); setForm({ date: new Date().toISOString().slice(0, 10), weight: null, height: null, headCirc: null }) }}
            className="btn-primary text-xs px-3 py-1.5"
          >
            + Agregar
          </button>
        </div>

        {/* Add / Edit form */}
        {adding && (
          <div className="px-4 py-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label text-xs">Fecha</label>
                <input type="date" className="input text-sm" value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">Peso (kg)</label>
                <input type="number" step="0.1" className="input text-sm" placeholder="ej: 7.5"
                  value={form.weight ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
              <div>
                <label className="label text-xs">Talla (cm)</label>
                <input type="number" step="0.1" className="input text-sm" placeholder="ej: 65"
                  value={form.height ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, height: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
              <div>
                <label className="label text-xs">PC (cm)</label>
                <input type="number" step="0.1" className="input text-sm" placeholder="Perímetro cefálico"
                  value={form.headCirc ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, headCirc: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="btn-primary text-xs px-3 py-1.5">
                {editingIdx !== null ? 'Actualizar' : 'Guardar'}
              </button>
              <button onClick={() => { setAdding(false); setEditingIdx(null) }} className="btn-outline text-xs px-3 py-1.5">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">📏</div>
            <p className="text-sm text-gray-400">Sin mediciones registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Edad</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Peso (kg)</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Talla (cm)</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">PC (cm)</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">
                      {new Date(r.date).toLocaleDateString('es-EC', { dateStyle: 'medium' })}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400 text-xs">
                      {r.ageMonths >= 12
                        ? `${Math.floor(r.ageMonths / 12)} a ${r.ageMonths % 12}m`
                        : `${r.ageMonths}m`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800 dark:text-gray-200">
                      {r.weight ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800 dark:text-gray-200">
                      {r.height ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800 dark:text-gray-200">
                      {r.headCirc ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(i)} className="text-xs text-primary hover:underline">Editar</button>
                        <button onClick={() => handleDelete(i)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section: Embarazo ───────────────────────────────────────────────────────

function EmbarazoSection({
  data,
  onChange,
}: {
  data: PregnancyData | null
  onChange: (d: PregnancyData | null) => void
}) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [fumInput, setFumInput] = useState('')
  const [addingControl, setAddingControl] = useState(false)
  const [controlForm, setControlForm] = useState<PregnancyControl>({
    date: new Date().toISOString().slice(0, 10),
    week: null,
    weight: null,
    bp: '',
    fuAltura: null,
    notes: '',
  })
  const [editingControlIdx, setEditingControlIdx] = useState<number | null>(null)

  function initPregnancy() {
    if (!fumInput) return
    const fpp = calcFPP(fumInput)
    onChange({ fum: fumInput, fpp, method: 'FUM', controls: [] })
    setShowNewForm(false)
  }

  function deletePregnancy() {
    if (confirm('¿Eliminar el control de embarazo actual?')) onChange(null)
  }

  function addControl() {
    if (!data) return
    const ga = calcGestationalAge(data.fum)
    const rec: PregnancyControl = {
      ...controlForm,
      week: controlForm.week ?? ga.weeks,
      weight: controlForm.weight ? Number(controlForm.weight) : null,
      fuAltura: controlForm.fuAltura ? Number(controlForm.fuAltura) : null,
    }
    if (editingControlIdx !== null) {
      const controls = [...data.controls]
      controls[editingControlIdx] = rec
      onChange({ ...data, controls })
      setEditingControlIdx(null)
    } else {
      onChange({ ...data, controls: [...data.controls, rec] })
    }
    setControlForm({ date: new Date().toISOString().slice(0, 10), week: null, weight: null, bp: '', fuAltura: null, notes: '' })
    setAddingControl(false)
  }

  function startEditControl(idx: number) {
    const c = data!.controls[idx]
    setControlForm({ ...c })
    setEditingControlIdx(idx)
    setAddingControl(true)
  }

  function deleteControl(idx: number) {
    if (!data) return
    onChange({ ...data, controls: data.controls.filter((_, i) => i !== idx) })
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 text-center">
          <div className="text-4xl mb-3">🤰</div>
          <p className="text-gray-500 dark:text-slate-300 font-medium mb-1">Sin control de embarazo activo</p>
          <p className="text-sm text-gray-400 mb-4">Ingresa la Fecha de Última Menstruación (FUM) para iniciar el seguimiento.</p>
          {showNewForm ? (
            <div className="max-w-xs mx-auto space-y-3">
              <div>
                <label className="label text-xs">Fecha de Última Menstruación (FUM)</label>
                <input type="date" className="input text-sm" value={fumInput}
                  onChange={(e) => setFumInput(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={initPregnancy} disabled={!fumInput} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
                  Iniciar seguimiento
                </button>
                <button onClick={() => setShowNewForm(false)} className="btn-outline text-sm px-4 py-2">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNewForm(true)} className="btn-primary text-sm px-5 py-2">
              + Iniciar control de embarazo
            </button>
          )}
        </div>
      </div>
    )
  }

  const ga = calcGestationalAge(data.fum)
  const fppDate = new Date(data.fpp)
  const today = new Date()
  const daysToFPP = Math.ceil((fppDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const trimester = getTrimester(ga.weeks)
  const progress = Math.min(Math.max((ga.weeks / 40) * 100, 0), 100)

  const sortedControls = [...data.controls].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Control de Embarazo</h3>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${trimester.color}`}>
              {trimester.label}
            </span>
          </div>
          <button onClick={deletePregnancy} className="text-xs text-red-500 hover:underline">
            Eliminar
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">FUM</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {new Date(data.fum).toLocaleDateString('es-EC', { dateStyle: 'medium' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Edad Gestacional</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {ga.weeks} sem {ga.days > 0 ? `+ ${ga.days}d` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">FPP (Naegele)</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {new Date(data.fpp).toLocaleDateString('es-EC', { dateStyle: 'medium' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{daysToFPP > 0 ? 'Días para FPP' : 'Días post-FPP'}</p>
            <p className={`text-sm font-semibold ${daysToFPP <= 14 && daysToFPP >= 0 ? 'text-orange-600' : 'text-gray-800 dark:text-white'}`}>
              {Math.abs(daysToFPP)} días
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Semana 0</span>
            <span>Semana 40</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${ga.weeks <= 13 ? 'bg-blue-400' : ga.weeks <= 26 ? 'bg-green-400' : 'bg-orange-400'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1er trimestre</span>
            <span>2do</span>
            <span>3er trimestre</span>
          </div>
        </div>
      </div>

      {/* Controls table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Controles prenatales ({data.controls.length})
          </p>
          <button
            onClick={() => {
              setAddingControl(true)
              setEditingControlIdx(null)
              const ga2 = calcGestationalAge(data.fum)
              setControlForm({ date: new Date().toISOString().slice(0, 10), week: ga2.weeks, weight: null, bp: '', fuAltura: null, notes: '' })
            }}
            className="btn-primary text-xs px-3 py-1.5"
          >
            + Control
          </button>
        </div>

        {/* Add/Edit control form */}
        {addingControl && (
          <div className="px-4 py-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="label text-xs">Fecha</label>
                <input type="date" className="input text-sm" value={controlForm.date}
                  onChange={(e) => setControlForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">Semanas</label>
                <input type="number" className="input text-sm" placeholder="Semanas gestación"
                  value={controlForm.week ?? ''}
                  onChange={(e) => setControlForm((f) => ({ ...f, week: e.target.value ? parseInt(e.target.value) : null }))} />
              </div>
              <div>
                <label className="label text-xs">Peso (kg)</label>
                <input type="number" step="0.1" className="input text-sm" placeholder="ej: 65.5"
                  value={controlForm.weight ?? ''}
                  onChange={(e) => setControlForm((f) => ({ ...f, weight: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
              <div>
                <label className="label text-xs">PA (T/A)</label>
                <input className="input text-sm" placeholder="ej: 110/70"
                  value={controlForm.bp}
                  onChange={(e) => setControlForm((f) => ({ ...f, bp: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">AU (cm)</label>
                <input type="number" step="0.5" className="input text-sm" placeholder="Altura uterina"
                  value={controlForm.fuAltura ?? ''}
                  onChange={(e) => setControlForm((f) => ({ ...f, fuAltura: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
              <div>
                <label className="label text-xs">Notas</label>
                <input className="input text-sm" placeholder="Observaciones..."
                  value={controlForm.notes}
                  onChange={(e) => setControlForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={addControl} className="btn-primary text-xs px-3 py-1.5">
                {editingControlIdx !== null ? 'Actualizar' : 'Guardar'}
              </button>
              <button onClick={() => { setAddingControl(false); setEditingControlIdx(null) }} className="btn-outline text-xs px-3 py-1.5">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {sortedControls.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-400">Sin controles registrados aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Fecha</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">Sem.</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Peso</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">T/A</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">AU (cm)</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Notas</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {sortedControls.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {new Date(c.date).toLocaleDateString('es-EC', { dateStyle: 'medium' })}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {c.week !== null ? (
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                          {c.week}s
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{c.weight ? `${c.weight} kg` : '—'}</td>
                    <td className="px-4 py-2.5 text-center text-gray-700 dark:text-gray-300">{c.bp || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{c.fuAltura ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400 max-w-xs truncate">{c.notes || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEditControl(data.controls.indexOf(c))} className="text-xs text-primary hover:underline">Editar</button>
                        <button onClick={() => deleteControl(data.controls.indexOf(c))} className="text-xs text-red-500 hover:underline">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'vacunas' | 'crecimiento' | 'embarazo'

export default function ControlesPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('vacunas')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([])
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([])
  const [pregnancyData, setPregnancyData] = useState<PregnancyData | null>(null)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${id}/controles`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBirthDate(data.birthDate ? data.birthDate.slice(0, 10) : null)
      setVaccineRecords(Array.isArray(data.vaccineRecords) ? data.vaccineRecords : [])
      setGrowthRecords(Array.isArray(data.growthRecords) ? data.growthRecords : [])
      setPregnancyData(data.pregnancyData ?? null)
    } catch {
      setError('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/patients/${id}/controles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaccineRecords, growthRecords, pregnancyData }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error guardando')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'vacunas',     label: 'Vacunas',     icon: '💉' },
    { key: 'crecimiento', label: 'Crecimiento', icon: '📏' },
    { key: 'embarazo',    label: 'Embarazo',    icon: '🤰' },
  ]

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Controles Médicos Especiales</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Guardado</span>}
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'vacunas' && (
        <VacunasSection
          birthDate={birthDate}
          records={vaccineRecords}
          onChange={setVaccineRecords}
        />
      )}
      {activeTab === 'crecimiento' && (
        <CrecimientoSection
          birthDate={birthDate}
          records={growthRecords}
          onChange={setGrowthRecords}
        />
      )}
      {activeTab === 'embarazo' && (
        <EmbarazoSection
          data={pregnancyData}
          onChange={setPregnancyData}
        />
      )}
    </div>
  )
}
