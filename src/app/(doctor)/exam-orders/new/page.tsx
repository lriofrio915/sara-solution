'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { EXAM_CATEGORIES, type ExamSelection } from '@/lib/exam-categories'

interface Patient { id: string; name: string; documentId: string | null }

export default function NewExamOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [patientQ, setPatientQ] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [exams, setExams] = useState<ExamSelection>({})
  const [otrosExams, setOtrosExams] = useState('')
  const [appointmentId] = useState(searchParams.get('appointmentId') ?? '')

  useEffect(() => {
    const pid = searchParams.get('patientId')
    if (pid) {
      fetch(`/api/patients/${pid}`).then(r => r.json()).then(d => {
        if (d.patient) setSelectedPatient({ id: d.patient.id, name: d.patient.name, documentId: d.patient.documentId })
      })
    }
  }, [searchParams])

  useEffect(() => {
    if (patientQ.length < 2) { setPatients([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(patientQ)}&limit=8`)
      const data = await res.json()
      setPatients(data.patients ?? [])
      setShowDropdown(true)
    }, 300)
    return () => clearTimeout(t)
  }, [patientQ])

  function toggleExam(categoryKey: string, examName: string) {
    setExams(prev => {
      const current = prev[categoryKey] ?? []
      const updated = current.includes(examName)
        ? current.filter(e => e !== examName)
        : [...current, examName]
      return { ...prev, [categoryKey]: updated }
    })
  }

  function isChecked(categoryKey: string, examName: string) {
    return (exams[categoryKey] ?? []).includes(examName)
  }

  function totalSelected() {
    return Object.values(exams).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient) { setError('Selecciona un paciente'); return }
    if (totalSelected() === 0 && !otrosExams.trim()) {
      setError('Selecciona al menos un examen')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/exam-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          appointmentId: appointmentId || null,
          exams,
          otrosExams: otrosExams || null,
          date,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar')
      }
      const data = await res.json()
      router.push(`/exam-orders/${data.order.id}/imprimir`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/exam-orders" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">← Órdenes</Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nueva orden de examen</h1>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Paciente y fecha */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Paciente y fecha</h2>
          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{selectedPatient.name}</p>
                {selectedPatient.documentId && <p className="text-xs text-gray-400">{selectedPatient.documentId}</p>}
              </div>
              <button type="button" onClick={() => { setSelectedPatient(null); setPatientQ('') }}
                className="text-xs text-gray-400 hover:text-red-500">Cambiar</button>
            </div>
          ) : (
            <div className="relative">
              <input type="text" value={patientQ} onChange={e => setPatientQ(e.target.value)}
                onFocus={() => patients.length > 0 && setShowDropdown(true)}
                placeholder="Buscar paciente..."
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
              {showDropdown && patients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                  {patients.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => { setSelectedPatient(p); setPatientQ(p.name); setShowDropdown(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">{p.name[0]}</div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div className="pt-5 text-sm text-gray-500 dark:text-slate-300">
              {totalSelected()} examen{totalSelected() !== 1 ? 'es' : ''} seleccionado{totalSelected() !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Checkbox grid */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Exámenes</h2>

          {EXAM_CATEGORIES.map(category => (
            <div key={category.key}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 border-b border-primary/20 pb-1">
                {category.label}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {category.exams.map(exam => (
                  <label key={exam}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                      isChecked(category.key, exam)
                        ? 'bg-primary/10 dark:bg-primary/20 border border-primary/30 text-primary font-medium'
                        : 'bg-gray-50 dark:bg-gray-700 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                    <input
                      type="checkbox"
                      checked={isChecked(category.key, exam)}
                      onChange={() => toggleExam(category.key, exam)}
                      className="accent-primary flex-shrink-0"
                    />
                    <span className="text-xs leading-tight">{exam}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* OTROS */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 border-b border-primary/20 pb-1">OTROS</h3>
            <textarea
              value={otrosExams}
              onChange={e => setOtrosExams(e.target.value)}
              rows={3}
              placeholder="Escribe exámenes adicionales no listados..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? 'Guardando...' : 'Guardar y ver PDF'}
          </button>
          <Link href="/exam-orders" className="btn-outline">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
