'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── AI Analysis Panel ────────────────────────────────────────────────────────

function AiAnalysisPanel({ patientId }: { patientId: string }) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [sources, setSources] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    setOpen(true)
    try {
      const res = await fetch(`/api/patients/${patientId}/ai-analysis`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al generar análisis')
      setAnalysis(data.analysis)
      setSources(data.sources ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar análisis')
    } finally {
      setLoading(false)
    }
  }

  // Simple markdown renderer (bold, headers, bullets, horizontal rules)
  function renderMarkdown(text: string) {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-bold text-gray-800 dark:text-white mt-3 mb-1">{line.slice(4)}</h4>
      if (line.startsWith('## '))  return <h3 key={i} className="text-base font-bold text-gray-900 dark:text-white mt-4 mb-1">{line.slice(3)}</h3>
      if (line.startsWith('# '))   return <h2 key={i} className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">{line.slice(2)}</h2>
      if (line.startsWith('---'))  return <hr key={i} className="border-gray-200 dark:border-gray-600 my-3" />
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.slice(2)
        return <li key={i} className="text-sm text-gray-700 dark:text-gray-300 ml-4 list-disc">{renderInline(content)}</li>
      }
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, '')
        return <li key={i} className="text-sm text-gray-700 dark:text-gray-300 ml-4 list-decimal">{renderInline(content)}</li>
      }
      if (line.trim() === '') return <br key={i} />
      return <p key={i} className="text-sm text-gray-700 dark:text-gray-300">{renderInline(line)}</p>
    })
  }

  function renderInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return <strong key={i} className="font-semibold text-gray-900 dark:text-white">{p.slice(2, -2)}</strong>
      }
      return p
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        onClick={() => !loading && setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-lg flex-shrink-0">
            ✨
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Análisis Clínico IA 360°</h2>
            <p className="text-xs text-gray-400 dark:text-slate-400">
              {analysis ? 'Análisis generado — clic para ver/ocultar' : 'Visión completa del paciente antes de la consulta'}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); generate() }}
          disabled={loading}
          className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analizando...
            </span>
          ) : analysis ? 'Regenerar' : 'Generar análisis'}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-slate-400">Sara está analizando el historial clínico completo...</p>
            </div>
          )}
          {error && !loading && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          {analysis && !loading && (
            <>
              <div className="space-y-1">
                {renderMarkdown(analysis)}
              </div>
              {sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 mb-1.5">Fuentes consultadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs rounded-full border border-purple-200 dark:border-purple-800">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {!analysis && !loading && !error && (
            <div className="py-6 text-center text-sm text-gray-400">
              Haz clic en &ldquo;Generar análisis&rdquo; para obtener una visión 360° del paciente.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const BLOOD_LABELS: Record<string, string> = {
  UNKNOWN: '—', A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}
const APPT_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  SCHEDULED:  { label: 'Programada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  CONFIRMED:  { label: 'Confirmada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  COMPLETED:  { label: 'Completada', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  CANCELLED:  { label: 'Cancelada', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  NO_SHOW:    { label: 'No asistió', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
}

interface Appointment {
  id: string
  date: string
  duration: number
  type: string
  status: string
  reason: string | null
}

interface MedicalRecord {
  id: string
  diagnosis: string
  treatment: string | null
  notes: string | null
  createdAt: string
}

interface Patient {
  id: string
  name: string
  email: string | null
  phone: string | null
  birthDate: string | null
  bloodType: string
  documentId: string | null
  documentType: string | null
  allergies: string[]
  notes: string | null
  createdAt: string
  authId: string | null
  appointments: Appointment[]
  medicalRecords: MedicalRecord[]
}

function calcAge(birthDate: string | null): string | null {
  if (!birthDate) return null
  const diff = Date.now() - new Date(birthDate).getTime()
  return `${Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))} años`
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Patient>>({})
  const [accessLoading, setAccessLoading] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string; reset?: boolean } | null>(null)
  const [revokeConfirm, setRevokeConfirm] = useState(false)

  useEffect(() => {
    fetch(`/api/patients/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setPatient(data.patient)
        setForm(data.patient)
      })
      .catch(() => setError('Error cargando paciente'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      const { patient: updated } = await res.json()
      // Preserve relational data not returned by PATCH
      setPatient((prev) => ({
        ...prev!,
        ...updated,
        appointments: prev?.appointments ?? [],
        medicalRecords: prev?.medicalRecords ?? [],
      }))
      setForm((prev) => ({ ...prev, ...updated }))
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateAccess() {
    setAccessLoading(true)
    setCredentials(null)
    try {
      const res = await fetch(`/api/patients/${id}/access`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setCredentials(data)
      setPatient((p) => p ? { ...p, authId: 'set' } : p)
    } finally {
      setAccessLoading(false)
    }
  }

  async function handleRevokeAccess() {
    setAccessLoading(true)
    try {
      const res = await fetch(`/api/patients/${id}/access`, { method: 'DELETE' })
      if (res.ok) {
        setPatient((p) => p ? { ...p, authId: null } : p)
        setRevokeConfirm(false)
        setCredentials(null)
      }
    } finally {
      setAccessLoading(false)
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  if (!patient) return (
    <div className="p-8">
      <p className="text-red-600">{error ?? 'Paciente no encontrado'}</p>
      <Link href="/patients" className="text-primary hover:underline mt-2 inline-block">← Volver</Link>
    </div>
  )

  const age = calcAge(patient.birthDate)

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/patients" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm transition-colors">
            ← Pacientes
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{patient.name}</h1>
          {age && <span className="text-sm text-gray-400 dark:text-slate-400">{age}</span>}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary text-sm py-2 disabled:opacity-60">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => { setEditing(false); setForm(patient) }}
                className="btn-outline text-sm py-2">
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="btn-outline text-sm py-2">
              Editar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* AI 360° Analysis */}
        <AiAnalysisPanel patientId={patient.id} />

        {/* Info card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-4">Información personal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Nombre" editing={editing}
              value={form.name ?? ''} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
            <Field label="Teléfono" editing={editing}
              value={form.phone ?? ''} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
            <Field label="Email" editing={editing}
              value={form.email ?? ''} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
            <Field label="Cédula / Pasaporte" editing={editing}
              value={form.documentId ?? ''} onChange={(v) => setForm((p) => ({ ...p, documentId: v }))} />
            <Field label="Fecha de nacimiento" editing={editing} type="date"
              value={form.birthDate ? form.birthDate.slice(0, 10) : ''}
              onChange={(v) => setForm((p) => ({ ...p, birthDate: v }))} />
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-400 mb-1">Tipo de sangre</p>
              {editing ? (
                <select value={form.bloodType ?? 'UNKNOWN'}
                  onChange={(e) => setForm((p) => ({ ...p, bloodType: e.target.value }))}
                  className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  {Object.entries(BLOOD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {BLOOD_LABELS[patient.bloodType] ?? '—'}
                </p>
              )}
            </div>
          </div>

          {/* Allergies */}
          <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-slate-400 mb-2">Alergias</p>
            {patient.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map((a) => (
                  <span key={a} className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin alergias registradas</p>
            )}
          </div>

          {/* Notes */}
          {(patient.notes || editing) && (
            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-slate-400 mb-1">Notas</p>
              {editing ? (
                <textarea value={form.notes ?? ''} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{patient.notes}</p>
              )}
            </div>
          )}
        </div>

        {/* Appointments */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">
              Citas ({patient.appointments.length})
            </h2>
            <Link href={`/appointments`}
              className="text-xs text-primary hover:underline">Ver todas →</Link>
          </div>
          {patient.appointments.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin citas registradas</p>
          ) : (
            <div className="space-y-3">
              {patient.appointments.map((a) => {
                const statusInfo = APPT_STATUS_LABEL[a.status] ?? { label: a.status, color: 'bg-gray-100 text-gray-600' }
                return (
                  <div key={a.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {new Date(a.date).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', dateStyle: 'medium' })}
                        {' '}·{' '}
                        {new Date(a.date).toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {a.reason && <p className="text-xs text-gray-400 mt-0.5">{a.reason}</p>}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Medical records */}
        {patient.medicalRecords.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-4">
              Historial médico
            </h2>
            <div className="space-y-4">
              {patient.medicalRecords.map((r) => (
                <div key={r.id} className="border-b border-gray-50 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                  <p className="text-xs text-gray-400 mb-1">
                    {new Date(r.createdAt).toLocaleDateString('es-EC', { dateStyle: 'medium' })}
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.diagnosis}</p>
                  {r.treatment && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Tratamiento: {r.treatment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patient portal access */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-1">
                Acceso al Portal del Paciente
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-300">
                {patient.authId
                  ? 'Este paciente ya tiene acceso activo al portal. Puede ver sus citas, recetas y más.'
                  : 'Genera credenciales para que el paciente pueda ver su información médica en el portal.'}
              </p>
              {!patient.email && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ⚠️ El paciente no tiene correo electrónico. Agrégalo antes de generar acceso.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {patient.authId ? (
                <>
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-medium">
                    ✓ Acceso activo
                  </span>
                  <button
                    onClick={handleGenerateAccess}
                    disabled={accessLoading}
                    className="text-sm btn-outline py-1.5 disabled:opacity-60"
                  >
                    {accessLoading ? '...' : 'Resetear contraseña'}
                  </button>
                  {!revokeConfirm ? (
                    <button
                      onClick={() => setRevokeConfirm(true)}
                      className="text-sm px-3 py-1.5 rounded-xl text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Revocar
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 dark:text-red-400">¿Confirmar?</span>
                      <button onClick={handleRevokeAccess} disabled={accessLoading}
                        className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                        Sí
                      </button>
                      <button onClick={() => setRevokeConfirm(false)}
                        className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        No
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={handleGenerateAccess}
                  disabled={accessLoading || !patient.email}
                  className="btn-primary text-sm py-2 disabled:opacity-60"
                >
                  {accessLoading ? 'Generando...' : 'Generar acceso'}
                </button>
              )}
            </div>
          </div>

          {/* Credentials box — shown once */}
          {credentials && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                {credentials.reset ? '🔑 Nueva contraseña generada' : '🎉 Acceso creado exitosamente'}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                Comparte estas credenciales con el paciente. La contraseña solo se muestra una vez.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Correo</p>
                  <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{credentials.email}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Contraseña temporal</p>
                  <p className="text-sm font-mono font-bold text-primary">{credentials.password}</p>
                </div>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                El paciente ingresa en: <strong>consultorio.site/login</strong>
              </p>
              <button
                onClick={() => setCredentials(null)}
                className="mt-2 text-xs text-blue-500 hover:underline"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, editing, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; editing: boolean; type?: string
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-slate-400 mb-1">{label}</p>
      {editing ? (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className="input text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
      ) : (
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value || '—'}</p>
      )}
    </div>
  )
}
