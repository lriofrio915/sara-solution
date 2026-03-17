'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Cie10Search from '@/components/Cie10Search'

interface Patient { id: string; name: string; documentId: string | null }

const CONTENT_TEMPLATES = [
  {
    label: 'Reposo médico',
    content: 'El/La paciente antes mencionado/a ha sido atendido/a en mi consulta médica el día de hoy. Después de la evaluación clínica correspondiente, se recomienda REPOSO ABSOLUTO por _____ días a partir de la presente fecha, por presentar _______________.\n\nEl paciente podrá reintegrarse a sus actividades normales a partir del _______________.',
  },
  {
    label: 'Certificado de salud',
    content: 'El/La paciente antes mencionado/a ha sido evaluado/a clínicamente, encontrándose en BUEN ESTADO DE SALUD al momento de la consulta, sin restricciones para realizar sus actividades habituales.',
  },
  {
    label: 'Certificado de atención',
    content: 'El/La paciente antes mencionado/a fue atendido/a en consulta médica el día de hoy, recibiendo diagnóstico y tratamiento correspondiente.\n\nDiagnóstico: _______________\nTratamiento: _______________\n\nSe indica seguimiento según evolución clínica.',
  },
]

export default function NewCertificatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [patientQ, setPatientQ] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [diagnosis, setDiagnosis] = useState('')
  const [treatment, setTreatment] = useState('')
  const [restDays, setRestDays] = useState('')
  const [restDateStart, setRestDateStart] = useState('')
  const [restDateEnd, setRestDateEnd] = useState('')
  const [content, setContent] = useState('')
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

  useEffect(() => {
    if (restDateStart && restDateEnd) {
      const start = new Date(restDateStart)
      const end = new Date(restDateEnd)
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      if (days > 0) setRestDays(String(days))
    }
  }, [restDateStart, restDateEnd])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient) { setError('Selecciona un paciente'); return }
    if (!content.trim()) { setError('El contenido del certificado es requerido'); return }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          appointmentId: appointmentId || null,
          content,
          diagnosis: diagnosis || null,
          treatment: treatment || null,
          restDays: restDays ? parseInt(restDays) : null,
          restDateStart: restDateStart || undefined,
          restDateEnd: restDateEnd || undefined,
          date,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar')
      }
      const data = await res.json()
      router.push(`/certificates/${data.certificate.id}/imprimir`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/certificates" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">← Certificados</Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo certificado médico</h1>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Paciente */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Paciente y fecha</h2>
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
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha de atención</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Días de reposo</label>
              <input type="number" min="0" max="365" value={restDays} onChange={e => setRestDays(e.target.value)}
                placeholder="0"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400" />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Período de reposo: desde</label>
              <input type="date" value={restDateStart} onChange={e => setRestDateStart(e.target.value)}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 pb-2">hasta</span>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">&nbsp;</label>
              <input type="date" value={restDateEnd} onChange={e => setRestDateEnd(e.target.value)}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Diagnóstico CIE-10</label>
            <Cie10Search value={diagnosis} onChange={setDiagnosis} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tratamiento</label>
            <input type="text" value={treatment} onChange={e => setTreatment(e.target.value)}
              placeholder="Ej: Antibioticoterapia + analgésicos"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400" />
          </div>
        </div>

        {/* Contenido */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Texto del certificado</h2>
            <div className="flex gap-2 flex-wrap">
              {CONTENT_TEMPLATES.map(t => (
                <button key={t.label} type="button"
                  onClick={() => setContent(t.content)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={10}
            required
            placeholder="El/La paciente... ha sido atendido/a... se certifica que..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
          />
          <p className="text-xs text-gray-400">Usa los botones de plantilla para comenzar rápidamente y personaliza según necesites.</p>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? 'Guardando...' : 'Guardar y ver PDF'}
          </button>
          <Link href="/certificates" className="btn-outline">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
