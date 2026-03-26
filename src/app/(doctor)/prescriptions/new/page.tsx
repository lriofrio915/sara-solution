'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Cie10Search from '@/components/Cie10Search'
import { checkHighAlert } from '@/lib/high-alert-medications'

interface Patient { id: string; name: string; documentId: string | null }

// ACESS-2023-0030: campos obligatorios de receta médica
interface Medication {
  dci: string           // DCI/nombre genérico — OBLIGATORIO (ACESS-2023-0030)
  name: string          // Nombre comercial (opcional)
  dose: string          // Concentración: "500 mg"
  pharmaceuticalForm: string // Forma farmacéutica: tableta, jarabe, etc.
  route: string         // Vía de administración: oral, IV, IM, SC, tópico
  frequency: string     // Frecuencia: "cada 8 horas"
  duration: string      // Duración: "7 días"
  notes: string         // Notas adicionales
}

const EMPTY_MED: Medication = {
  dci: '', name: '', dose: '', pharmaceuticalForm: '',
  route: '', frequency: '', duration: '', notes: '',
}

const ROUTES = ['Oral', 'Intravenosa (IV)', 'Intramuscular (IM)', 'Subcutánea (SC)', 'Tópica', 'Inhalatoria', 'Sublingual', 'Rectal', 'Oftálmica', 'Ótica', 'Nasal', 'Transdérmica']
const PHARMA_FORMS = ['Tableta', 'Cápsula', 'Jarabe', 'Suspensión', 'Solución oral', 'Inyectable', 'Crema', 'Ungüento', 'Gel', 'Colirio', 'Supositorio', 'Parche', 'Aerosol', 'Polvo', 'Ampolla']

export default function NewPrescriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileWarning, setProfileWarning] = useState<string | null>(null)

  // Patient search
  const [patientQ, setPatientQ] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // Form
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [diagnosis, setDiagnosis] = useState('')
  const [medications, setMedications] = useState<Medication[]>([{ ...EMPTY_MED }])
  const [instructions, setInstructions] = useState('')
  const [appointmentId] = useState(searchParams.get('appointmentId') ?? '')

  // Check required profile fields for signing
  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      const missing: string[] = []
      if (!d.cedulaId) missing.push('Cédula de Identidad')
      if (!d.mspCode) missing.push('Código MSP/ACESS')
      if (!d.specialtyRegCode) missing.push('Registro de Especialidad')
      if (missing.length > 0) {
        setProfileWarning(`Completa tu perfil para habilitar la firma digital: ${missing.join(', ')}`)
      }
    }).catch(() => {})
  }, [])

  // Pre-load patient if provided
  useEffect(() => {
    const pid = searchParams.get('patientId')
    if (pid) {
      fetch(`/api/patients/${pid}`).then(r => r.json()).then(d => {
        if (d.patient) setSelectedPatient({ id: d.patient.id, name: d.patient.name, documentId: d.patient.documentId })
      })
    }
  }, [searchParams])

  // Patient search debounced
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

  function addMed() { setMedications(prev => [...prev, { ...EMPTY_MED }]) }
  function removeMed(i: number) { setMedications(prev => prev.filter((_, idx) => idx !== i)) }
  function updateMed(i: number, field: keyof Medication, value: string) {
    setMedications(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient) { setError('Selecciona un paciente'); return }

    const validMeds = medications.filter(m => m.dci.trim() || m.name.trim())
    if (validMeds.length === 0) { setError('Agrega al menos un medicamento con DCI'); return }

    // Validar DCI obligatorio (ACESS-2023-0030)
    const sinDci = validMeds.filter(m => !m.dci.trim())
    if (sinDci.length > 0) {
      setError(`El nombre genérico (DCI) es obligatorio en todos los medicamentos. ACESS-2023-0030.`)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          appointmentId: appointmentId || null,
          medications: validMeds,
          instructions: instructions || null,
          diagnosis: diagnosis || null,
          date,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar')
      }
      const data = await res.json()
      router.push(`/prescriptions/${data.prescription.id}/imprimir`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/prescriptions" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">← Recetario</Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nueva receta</h1>
      </div>

      {profileWarning && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-xl text-sm flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>{profileWarning} — <a href="/profile" className="underline font-medium">Ir a Mi Perfil</a></span>
        </div>
      )}

      {error && (
        <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Paciente */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Paciente y fecha</h2>
          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{selectedPatient.name}</p>
                {selectedPatient.documentId && <p className="text-xs text-gray-400">{selectedPatient.documentId}</p>}
              </div>
              <button type="button" onClick={() => { setSelectedPatient(null); setPatientQ('') }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">Cambiar</button>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Diagnóstico CIE-10</label>
            <Cie10Search value={diagnosis} onChange={setDiagnosis} />
          </div>
        </div>

        {/* PRESCRIPCIÓN */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Prescripción (medicamentos)</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Requisito ACESS-2023-0030: DCI obligatorio en toda receta médica</p>
            </div>
            <button type="button" onClick={addMed}
              className="text-xs font-semibold text-primary hover:underline">+ Agregar</button>
          </div>

          {medications.map((med, i) => {
            const highAlert = med.dci.trim() ? checkHighAlert(med.dci) : null
            return (
              <div key={i} className={`border rounded-xl p-4 space-y-3 relative ${highAlert ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-700'}`}>
                {medications.length > 1 && (
                  <button type="button" onClick={() => removeMed(i)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-400 text-sm">✕</button>
                )}

                {/* Alerta ISMP */}
                {highAlert && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-700 dark:text-red-400">
                    <span className="font-bold flex-shrink-0">ALTO RIESGO ({highAlert.category}):</span>
                    <span>{highAlert.warning}</span>
                  </div>
                )}

                {/* DCI — campo obligatorio */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Nombre genérico (DCI) <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">— obligatorio por ACESS</span>
                  </label>
                  <input type="text" value={med.dci} onChange={e => updateMed(i, 'dci', e.target.value)}
                    required
                    placeholder="Ej: amoxicilina, metformina, enalapril"
                    className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-300 mb-1">Nombre comercial (opcional)</label>
                    <input type="text" value={med.name} onChange={e => updateMed(i, 'name', e.target.value)}
                      placeholder="Ej: Amoxil, Glucophage"
                      className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-300 mb-1">Concentración / Dosis</label>
                    <input type="text" value={med.dose} onChange={e => updateMed(i, 'dose', e.target.value)}
                      placeholder="Ej: 500 mg"
                      className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-300 mb-1">Forma farmacéutica</label>
                    <select value={med.pharmaceuticalForm} onChange={e => updateMed(i, 'pharmaceuticalForm', e.target.value)}
                      className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="">Seleccionar...</option>
                      {PHARMA_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-300 mb-1">Vía de administración</label>
                    <select value={med.route} onChange={e => updateMed(i, 'route', e.target.value)}
                      className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="">Seleccionar...</option>
                      {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-300 mb-1">Frecuencia</label>
                    <input type="text" value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}
                      placeholder="Ej: cada 8 horas"
                      className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-300 mb-1">Duración del tratamiento</label>
                    <input type="text" value={med.duration} onChange={e => updateMed(i, 'duration', e.target.value)}
                      placeholder="Ej: 7 días"
                      className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-300 mb-1">Notas adicionales</label>
                  <input type="text" value={med.notes} onChange={e => updateMed(i, 'notes', e.target.value)}
                    placeholder="Ej: Tomar con alimentos, evitar en embarazo"
                    className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500" />
                </div>
              </div>
            )
          })}
        </div>

        {/* INDICACIONES */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Indicaciones para el paciente</h2>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={6}
            placeholder="Ej:
1. Reposo relativo por 3 días
2. Dieta blanda, abundantes líquidos
3. Evitar exposición al frío
4. Regresar si los síntomas no mejoran en 48h"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? 'Guardando...' : 'Guardar y ver PDF'}
          </button>
          <Link href="/prescriptions" className="btn-outline">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
