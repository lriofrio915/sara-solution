'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Diagnosis {
  cie10Code: string
  cie10Desc: string
  observations: string
  isNew: boolean
  isDefinitive: boolean
}

interface PrescriptionItem {
  medicine: string
  presentation: string
  dosis: string
  quantity: string
  indications: string
}

interface BillingItem {
  description: string
  quantity: number
  unitPrice: number
}

interface ExplorationData {
  peso: string
  talla: string
  imc: string
  pasSistolica: string
  pasDiastolica: string
  frecuenciaCardiaca: string
  frecuenciaRespiratoria: string
  temperatura: string
  saturacionO2: string
  perimetroCefalico: string
  piel: string
  cabezaCuello: string
  torax: string
  abdomen: string
  extremidades: string
  neurologico: string
  observacionesGenerales: string
}

interface AttentionData {
  establishment: string
  service: string
  insurance: string
  fecha: string
  hora: string
  motive: string
  evolution: string
  exploration: ExplorationData
  diagnoses: Diagnosis[]
  prescriptionItems: PrescriptionItem[]
  prescriptionDiagnosis: string[]
  prescriptionValidUntil: string
  prescriptionNextAppointment: string
  prescriptionNotes: string
  exams: Record<string, string[] | string>
  images: { url: string; description: string }[]
  examEvolutionNotes: string
  billing: BillingItem[]
  billingStatus: string
  otrosExams: Record<string, string>
}

interface Cie10Result {
  code: string
  description?: string
  title?: string
}

export interface PatientSummary {
  allergies: string[]
  currentMedication: string
  personalPathologic: string
  heredoFamiliar: string
}

// Imported from shared lib to keep consistent with ÓRDENES section
import { EXAM_CATEGORIES, IMAGING_CATEGORIES } from '@/lib/exam-categories'

const TABS = ['Exploración', 'Diagnóstico', 'Prescripción', 'Exámenes', 'Imágenes', 'Certificados', 'Facturación']

function addBusinessDays(date: Date, days: number): string {
  const d = new Date(date)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

function defaultExploration(): ExplorationData {
  return {
    peso: '', talla: '', imc: '',
    pasSistolica: '', pasDiastolica: '',
    frecuenciaCardiaca: '', frecuenciaRespiratoria: '',
    temperatura: '', saturacionO2: '', perimetroCefalico: '',
    piel: '',
    cabezaCuello: '', torax: '', abdomen: '', extremidades: '',
    neurologico: '', observacionesGenerales: '',
  }
}

function defaultExams(): Record<string, string[]> {
  const exams: Record<string, string[]> = {}
  for (const cat of EXAM_CATEGORIES) exams[cat.key] = []
  for (const cat of IMAGING_CATEGORIES) exams[cat.key] = []
  return exams
}

// ─── Certificados Tab ─────────────────────────────────────────────────────────

interface CertificadosTabProps {
  patientId: string
  attentionId?: string
  diagnoses: Diagnosis[]
}

function CertificadosTab({ patientId, attentionId, diagnoses }: CertificadosTabProps) {
  const [tipo, setTipo] = useState<'reposo' | 'atencion' | 'salud'>('atencion')
  const [diasReposo, setDiasReposo] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [generating, setGenerating] = useState(false)
  const [certId, setCertId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerar() {
    if (!attentionId) return
    setGenerating(true)
    setError(null)
    try {
      const diagText = diagnoses.map(d => `${d.cie10Desc} (${d.cie10Code})`).join('; ')
      const body: Record<string, unknown> = {
        tipo,
        diagnosis: diagText || null,
        description: descripcion || null,
      }
      if (tipo === 'reposo') {
        body.restDays = diasReposo ? parseInt(diasReposo) : null
        body.restDateStart = fechaInicio || null
        body.restDateEnd = fechaFin || null
      }
      const res = await fetch(`/api/patients/${patientId}/atenciones/${attentionId}/certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error generando certificado')
      setCertId(data.certificateId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {!attentionId && (
        <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
          Guarda la atención primero para generar un certificado.
        </p>
      )}

      <div>
        <label className="label text-xs">Tipo de certificado</label>
        <div className="flex gap-3 mt-1">
          {(['atencion', 'reposo', 'salud'] as const).map(t => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="text-primary" />
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                {t === 'atencion' ? 'Atención Médica' : t === 'reposo' ? 'Reposo Médico' : 'Salud'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {tipo === 'reposo' && (
        <div className="space-y-3">
          <div>
            <label className="label text-xs">Días de reposo</label>
            <input type="number" min="1" className="input text-sm w-32" value={diasReposo} onChange={e => setDiasReposo(e.target.value)} placeholder="3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Fecha inicio</label>
              <input type="date" className="input text-sm" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Fecha fin</label>
              <input type="date" className="input text-sm" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="label text-xs">Descripción / Observaciones</label>
        <textarea
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          rows={3}
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="El paciente estuvo bajo atención médica por..."
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerar}
          disabled={!attentionId || generating}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? 'Generando...' : 'Generar certificado'}
        </button>
        {certId && (
          <a
            href={`/certificates/${certId}/imprimir`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Ver certificado →
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  patientId: string
  attentionId?: string
  initialData?: Partial<AttentionData>
  previousAttention?: {
    datetime: string
    motive: string | null
    evolution: string | null
    diagnoses: unknown
  } | null
  doctorEstablishments?: string[]
  doctorServices?: string[]
  patientSummary?: PatientSummary
}

export default function AttentionForm({
  patientId,
  attentionId,
  initialData,
  previousAttention,
  doctorEstablishments = [],
  doctorServices = [],
  patientSummary,
}: Props) {
  const router = useRouter()
  const startTimeRef = useRef(Date.now())
  const [elapsedMins, setElapsedMins] = useState(0)
  const [activeTab, setActiveTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPrevious, setShowPrevious] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // CIE10 search
  const [cie10Query, setCie10Query] = useState('')
  const [cie10Results, setCie10Results] = useState<Cie10Result[]>([])
  const [cie10Loading, setCie10Loading] = useState(false)
  const [showManualDiag, setShowManualDiag] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [manualDesc, setManualDesc] = useState('')

  // Attachment preview
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; description: string } | null>(null)

  // IDs de documentos vinculados a esta atención (para botones de preview)
  const [linkedPrescriptionId, setLinkedPrescriptionId] = useState<string | null>(null)
  const [linkedExamOrderId, setLinkedExamOrderId] = useState<string | null>(null)
  useEffect(() => {
    if (!attentionId || !patientId) return
    fetch(`/api/prescriptions?attentionId=${attentionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.prescriptions?.[0]?.id) setLinkedPrescriptionId(d.prescriptions[0].id) })
      .catch(() => {})
    fetch(`/api/exam-orders?attentionId=${attentionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.orders?.[0]?.id || d?.examOrders?.[0]?.id) setLinkedExamOrderId(d?.orders?.[0]?.id ?? d?.examOrders?.[0]?.id) })
      .catch(() => {})
  }, [attentionId, patientId])

  // Presentaciones farmacéuticas (base + custom desde localStorage)
  const BASE_PRESENTATIONS = ['Tabletas', 'Cápsulas', 'Ampollas', 'Jarabe']
  const [customPresentations, setCustomPresentations] = useState<string[]>([])
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sara_pres_custom')
      if (saved) setCustomPresentations(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])
  function addCustomPresentation(value: string) {
    if (!value.trim()) return
    const next = [...customPresentations.filter(p => p !== value.trim()), value.trim()]
    setCustomPresentations(next)
    localStorage.setItem('sara_pres_custom', JSON.stringify(next))
  }

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, ok })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  // File upload for Exámenes y Evolución
  const examFileInputRef = useRef<HTMLInputElement>(null)

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const timeStr = now.toTimeString().slice(0, 5)

  const [form, setForm] = useState<AttentionData>({
    establishment: '',
    service: doctorServices[0] ?? 'Consulta',
    insurance: '',
    fecha: todayStr,
    hora: timeStr,
    motive: '',
    evolution: '',
    exploration: defaultExploration(),
    diagnoses: [],
    prescriptionItems: [],
    prescriptionDiagnosis: [],
    prescriptionNotes: `Recomendaciones:\nSignos de Alarma:\nAlergias:${patientSummary?.allergies?.length ? ' ' + patientSummary.allergies.join(', ') : ''}`,
    exams: defaultExams(),
    images: [],
    examEvolutionNotes: '',
    billing: [],
    billingStatus: 'Pendiente',
    otrosExams: {},
    ...initialData,
    prescriptionValidUntil: initialData?.prescriptionValidUntil ?? addBusinessDays(new Date(), 5),
    prescriptionNextAppointment: initialData?.prescriptionNextAppointment ?? '',
  })
  // Las presentaciones custom viven en localStorage, así que en otro navegador o
  // dispositivo no existían como opción y el campo se veía vacío pese a estar guardado.
  // Se incluyen también las que ya traen los ítems de esta receta.
  const presentationOptions = Array.from(new Set([
    ...BASE_PRESENTATIONS,
    ...customPresentations,
    ...form.prescriptionItems.map(it => it.presentation).filter(Boolean),
  ]))

  // Chronometer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMins(Math.floor((Date.now() - startTimeRef.current) / 60000))
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  function update<K extends keyof AttentionData>(key: K, value: AttentionData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  function updateExploration(field: keyof ExplorationData, value: string) {
    const next = { ...form.exploration, [field]: value }
    // Auto-calculate BMI
    if (field === 'peso' || field === 'talla') {
      const peso = parseFloat(field === 'peso' ? value : form.exploration.peso)
      const tallaCm = parseFloat(field === 'talla' ? value : form.exploration.talla)
      if (peso > 0 && tallaCm > 0) {
        const tallaM = tallaCm / 100
        next.imc = (peso / (tallaM * tallaM)).toFixed(1)
      }
    }
    update('exploration', next)
  }

  // CIE10 search debounce
  useEffect(() => {
    if (cie10Query.length < 2) { setCie10Results([]); return }
    const timeout = setTimeout(async () => {
      setCie10Loading(true)
      try {
        const res = await fetch(`/api/icd11?q=${encodeURIComponent(cie10Query)}`)
        const data = await res.json()
        setCie10Results(data.results ?? [])
      } catch {
        setCie10Results([])
      } finally {
        setCie10Loading(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [cie10Query])

  function addDiagnosis(code: string, desc: string) {
    const newDiag: Diagnosis = { cie10Code: code, cie10Desc: desc, observations: '', isNew: false, isDefinitive: false }
    update('diagnoses', [...form.diagnoses, newDiag])
    setCie10Query('')
    setCie10Results([])
  }

  function removeDiagnosis(index: number) {
    update('diagnoses', form.diagnoses.filter((_, i) => i !== index))
  }

  function addPrescriptionItem() {
    update('prescriptionItems', [...form.prescriptionItems, { medicine: '', presentation: '', dosis: '', quantity: '', indications: '' }])
  }

  function removePrescriptionItem(i: number) {
    update('prescriptionItems', form.prescriptionItems.filter((_, idx) => idx !== i))
  }

  function addBillingItem() {
    update('billing', [...form.billing, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeBillingItem(i: number) {
    update('billing', form.billing.filter((_, idx) => idx !== i))
  }

  function toggleExam(categoryKey: string, item: string) {
    const raw = form.exams[categoryKey]
    const current: string[] = Array.isArray(raw) ? raw : []
    const next = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item]
    update('exams', { ...form.exams, [categoryKey]: next })
  }

  async function handleExamFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const newImages = [...form.images]
    for (const file of Array.from(files)) {
      const reader = new FileReader()
      await new Promise<void>((resolve) => {
        reader.onload = (ev) => {
          newImages.push({ url: ev.target?.result as string, description: file.name })
          resolve()
        }
        reader.readAsDataURL(file)
      })
    }
    update('images', newImages)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const datetime = `${form.fecha}T${form.hora}:00`
      const explorationWithNotes = {
        ...form.exploration,
        examEvolutionNotes: form.examEvolutionNotes || null,
      }
      // Merge otrosExams metadata into exams JSON (namespaced keys)
      const examsWithOtros: Record<string, string[] | string> = { ...form.exams }
      for (const [catKey, val] of Object.entries(form.otrosExams)) {
        if (val) examsWithOtros[`${catKey}__otros`] = val
      }
      const payload = {
        establishment: form.establishment || null,
        service: form.service || null,
        insurance: form.insurance || null,
        datetime,
        durationMins: elapsedMins > 0 ? elapsedMins : null,
        motive: form.motive || null,
        evolution: form.evolution || null,
        exploration: explorationWithNotes,
        diagnoses: form.diagnoses,
        prescriptionData: {
          items: form.prescriptionItems,
          diagnosis: form.prescriptionDiagnosis.length > 0 ? form.prescriptionDiagnosis : null,
          validUntil: form.prescriptionValidUntil || null,
          nextAppointment: form.prescriptionNextAppointment || null,
          notes: form.prescriptionNotes || null,
        },
        exams: examsWithOtros,
        images: form.images,
        billing: { items: form.billing, status: form.billingStatus },
      }

      let res
      if (attentionId) {
        res = await fetch(`/api/patients/${patientId}/atenciones/${attentionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/patients/${patientId}/atenciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al guardar')
      const data = await res.json()
      setIsDirty(false)
      const savedId = data.attention?.id ?? attentionId
      showToast('Atención guardada con éxito ✓')
      setTimeout(() => router.push(`/patients/${patientId}/atenciones/${savedId}`), 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      setError(msg)
      showToast(msg, false)
    } finally {
      setSaving(false)
    }
  }

  function handleExit() {
    if (isDirty && !confirm('¿Salir sin guardar los cambios?')) return
    router.push(`/patients/${patientId}/atenciones`)
  }

  const billingTotal = form.billing.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  return (
    <div className="max-w-7xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Patient summary banner */}
      {patientSummary && (patientSummary.allergies.length > 0 || patientSummary.currentMedication || patientSummary.personalPathologic || patientSummary.heredoFamiliar) && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3">
            📋 Recordatorio clínico del paciente
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {patientSummary.allergies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">🚨 Alergias</p>
                <div className="flex flex-wrap gap-1">
                  {patientSummary.allergies.map(a => (
                    <span key={a} className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full border border-orange-200 dark:border-orange-700">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {patientSummary.currentMedication && (
              <div>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">💊 Medicación habitual</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line">{patientSummary.currentMedication}</p>
              </div>
            )}
            {patientSummary.personalPathologic && (
              <div>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">🏥 Antecedentes personales</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">{patientSummary.personalPathologic}</p>
              </div>
            )}
            {patientSummary.heredoFamiliar && (
              <div>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">🧬 Antecedentes familiares</p>
                <p className="text-xs text-gray-700 dark:text-gray-300">{patientSummary.heredoFamiliar}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Left panel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Datos de la consulta</h3>
            <span className="flex items-center gap-1 text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded-full">
              ⏱ {elapsedMins}m
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Establecimiento</label>
              {doctorEstablishments.length > 0 ? (
                <select
                  className="input text-sm py-1.5"
                  value={form.establishment}
                  onChange={(e) => update('establishment', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {doctorEstablishments.map(est => (
                    <option key={est} value={est}>{est}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input text-sm py-1.5"
                  value={form.establishment}
                  onChange={(e) => update('establishment', e.target.value)}
                  placeholder="Clínica, hospital..."
                />
              )}
            </div>
            <div>
              <label className="label text-xs">Servicio</label>
              {doctorServices.length > 0 ? (
                <select
                  className="input text-sm py-1.5"
                  value={form.service}
                  onChange={(e) => update('service', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {doctorServices.map(svc => (
                    <option key={svc} value={svc}>{svc}</option>
                  ))}
                </select>
              ) : (
                <select
                  className="input text-sm py-1.5"
                  value={form.service}
                  onChange={(e) => update('service', e.target.value)}
                >
                  <option value="Consulta">Consulta</option>
                  <option value="Emergencia">Emergencia</option>
                  <option value="Hospitalización">Hospitalización</option>
                </select>
              )}
            </div>
            <div>
              <label className="label text-xs">Seguro</label>
              <input
                className="input text-sm py-1.5"
                value={form.insurance}
                onChange={(e) => update('insurance', e.target.value)}
                placeholder="Nombre del seguro"
              />
            </div>
            <div>
              <label className="label text-xs">Fecha</label>
              <input
                type="date"
                className="input text-sm py-1.5"
                value={form.fecha}
                onChange={(e) => update('fecha', e.target.value)}
              />
            </div>
            <div>
              <label className="label text-xs">Hora</label>
              <input
                type="time"
                className="input text-sm py-1.5"
                value={form.hora}
                onChange={(e) => update('hora', e.target.value)}
              />
            </div>
          </div>

          {/* Previous attention */}
          {previousAttention && (
            <div>
              <button
                type="button"
                onClick={() => setShowPrevious(!showPrevious)}
                className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <span>{showPrevious ? '▲' : '▼'}</span>
                Atención anterior ({new Date(previousAttention.datetime).toLocaleDateString('es-EC')})
              </button>
              {showPrevious && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-600 dark:text-slate-300 space-y-1">
                  {previousAttention.motive && <p><strong>Motivo:</strong> {previousAttention.motive}</p>}
                  {previousAttention.evolution && <p><strong>Evolución:</strong> {previousAttention.evolution}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
          <div>
            <label className="label text-sm font-semibold text-gray-700 dark:text-gray-300">Motivo de consulta</label>
            <textarea
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={4}
              value={form.motive}
              onChange={(e) => update('motive', e.target.value)}
              placeholder="Motivo principal de la consulta..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label text-sm font-semibold text-gray-700 dark:text-gray-300 mb-0">Enfermedad actual</label>
              {previousAttention?.evolution && (
                <button
                  type="button"
                  onClick={() => update('evolution', previousAttention.evolution ?? '')}
                  className="text-xs text-primary hover:underline"
                >
                  Cargar última atención
                </button>
              )}
            </div>
            <textarea
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={4}
              value={form.evolution}
              onChange={(e) => update('evolution', e.target.value)}
              placeholder="Descripción de la enfermedad actual..."
            />
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden mb-4">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-700">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === i
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-5">
          {/* Tab 1: Exploración */}
          {activeTab === 0 && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-3">
                  Signos Vitales
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {([
                    ['peso', 'Peso (kg)'],
                    ['talla', 'Talla (cm)'],
                    ['imc', 'IMC (calculado)'],
                    ['pasSistolica', 'PA Sistólica (mmHg)'],
                    ['pasDiastolica', 'PA Diastólica (mmHg)'],
                    ['frecuenciaCardiaca', 'Frec. Cardíaca (lpm)'],
                    ['frecuenciaRespiratoria', 'Frec. Respiratoria (rpm)'],
                    ['temperatura', 'Temperatura (°C)'],
                    ['saturacionO2', 'Saturación O₂ (%)'],
                    ['perimetroCefalico', 'Perímetro Cefálico (cm)'],
                  ] as [keyof ExplorationData, string][]).map(([key, label]) => (
                    <div key={key}>
                      <label className="label text-xs">{label}</label>
                      <input
                        className={`input text-sm py-1.5 ${key === 'imc' ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                        value={form.exploration[key]}
                        onChange={(e) => updateExploration(key, e.target.value)}
                        readOnly={key === 'imc'}
                        placeholder={key === 'imc' ? 'Auto' : ''}
                        type="number"
                        step="any"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-3">
                  Examen Físico
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {([
                    ['piel', 'Piel'],
                    ['cabezaCuello', 'Cabeza y Cuello'],
                    ['torax', 'Tórax'],
                    ['abdomen', 'Abdomen'],
                    ['extremidades', 'Extremidades'],
                    ['neurologico', 'Neurológico'],
                    ['observacionesGenerales', 'Observaciones Generales'],
                  ] as [keyof ExplorationData, string][]).map(([key, label]) => (
                    <div key={key}>
                      <label className="label text-xs">{label}</label>
                      <textarea
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        rows={2}
                        value={form.exploration[key]}
                        onChange={(e) => updateExploration(key, e.target.value)}
                        placeholder={label}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Exámenes y Evolución */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400 mb-3">
                  Exámenes y Evolución
                </h4>
                <div className="space-y-3">
                  <div>
                    <input
                      ref={examFileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      className="hidden"
                      onChange={handleExamFileUpload}
                    />
                    <div
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl py-6 flex flex-col items-center justify-center gap-2 hover:border-primary dark:hover:border-primary transition-colors cursor-pointer"
                      onClick={() => examFileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault()
                        const files = Array.from(e.dataTransfer.files)
                        const newImages = [...form.images]
                        for (const file of files) {
                          const reader = new FileReader()
                          await new Promise<void>((resolve) => {
                            reader.onload = (ev) => {
                              newImages.push({ url: ev.target?.result as string, description: file.name })
                              resolve()
                            }
                            reader.readAsDataURL(file)
                          })
                        }
                        update('images', newImages)
                      }}
                    >
                      <span className="text-2xl">📎</span>
                      <span className="text-sm text-gray-500 dark:text-slate-300">
                        Arrastra o haz clic para subir documentos, imágenes o PDFs
                      </span>
                      <span className="text-xs text-gray-400">PNG, JPG, PDF</span>
                    </div>
                  </div>

                  {form.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {form.images.map((img, i) => (
                        <div key={i} className="relative border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                          {img.url.startsWith('data:image') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img.url} alt={img.description} className="w-full h-24 object-cover cursor-pointer" onClick={() => setPreviewAttachment(img)} />
                          ) : (
                            <div
                              className="w-full h-24 bg-gray-50 dark:bg-gray-700 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              onClick={() => setPreviewAttachment(img)}
                            >
                              <span className="text-2xl">📄</span>
                              <span className="text-xs text-gray-500 dark:text-slate-400">PDF</span>
                            </div>
                          )}
                          <div className="p-1.5 space-y-1">
                            <input
                              className="input text-xs py-0.5"
                              value={img.description}
                              onChange={(e) => {
                                const next = [...form.images]
                                next[i] = { ...next[i], description: e.target.value }
                                update('images', next)
                              }}
                              placeholder="Descripción..."
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setPreviewAttachment(img)}
                                className="flex-1 text-xs text-primary hover:underline py-0.5"
                              >
                                👁 Ver
                              </button>
                              <a
                                href={img.url}
                                download={img.description || 'adjunto'}
                                className="flex-1 text-xs text-center text-gray-500 dark:text-slate-400 hover:underline py-0.5"
                              >
                                ⬇ Descargar
                              </a>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => update('images', form.images.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="label text-xs">Interpretación y evolución del caso</label>
                    <textarea
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      rows={4}
                      value={form.examEvolutionNotes}
                      onChange={(e) => update('examEvolutionNotes', e.target.value)}
                      placeholder="Interpretación de los exámenes presentados y evolución del caso clínico..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Diagnóstico */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <label className="label text-xs">Buscar diagnóstico CIE-10 / ICD-11</label>
                <input
                  className="input text-sm"
                  value={cie10Query}
                  onChange={(e) => { setCie10Query(e.target.value); setShowManualDiag(false) }}
                  placeholder="Ej: diabetes tipo 2, E11, hipertensión, asma..."
                />
                {cie10Loading && (
                  <div className="absolute right-3 top-8">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
                {cie10Results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                    {cie10Results.map((result) => (
                      <button
                        key={result.code}
                        type="button"
                        onClick={() => addDiagnosis(result.code, result.title ?? result.description ?? '')}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0"
                      >
                        <span className="font-mono text-primary text-xs mr-2">{result.code}</span>
                        <span className="text-gray-700 dark:text-gray-300">{result.title ?? result.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual diagnosis entry */}
              <div>
                <button
                  type="button"
                  onClick={() => { setShowManualDiag(!showManualDiag); setCie10Results([]) }}
                  className="text-xs text-primary hover:underline"
                >
                  + Agregar diagnóstico manualmente
                </button>
                {showManualDiag && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label text-xs">Código CIE-10 (opcional)</label>
                        <input
                          className="input text-xs py-1"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          placeholder="Ej: J45.9"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Descripción *</label>
                        <input
                          className="input text-xs py-1"
                          value={manualDesc}
                          onChange={(e) => setManualDesc(e.target.value)}
                          placeholder="Nombre de la enfermedad"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!manualDesc.trim()}
                      onClick={() => {
                        if (!manualDesc.trim()) return
                        addDiagnosis(manualCode.trim(), manualDesc.trim())
                        setManualCode('')
                        setManualDesc('')
                        setShowManualDiag(false)
                      }}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                  </div>
                )}
              </div>

              {form.diagnoses.length > 0 ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium whitespace-nowrap">Código</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium">Descripción</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium">Observaciones</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium whitespace-nowrap">Tipo</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.diagnoses.map((d, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                          <td className="px-3 py-2 font-mono text-primary text-xs whitespace-nowrap">{d.cie10Code}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300 text-xs">{d.cie10Desc}</td>
                          <td className="px-3 py-2">
                            <input
                              className="input text-xs py-1"
                              value={d.observations}
                              onChange={(e) => {
                                const next = [...form.diagnoses]
                                next[i] = { ...next[i], observations: e.target.value }
                                update('diagnoses', next)
                              }}
                              placeholder="Observaciones..."
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={d.isDefinitive ? 'definitivo' : 'presuntivo'}
                              onChange={(e) => {
                                const next = [...form.diagnoses]
                                next[i] = { ...next[i], isDefinitive: e.target.value === 'definitivo' }
                                update('diagnoses', next)
                              }}
                              className="input text-xs py-1 w-28"
                            >
                              <option value="presuntivo">Presuntivo</option>
                              <option value="definitivo">Definitivo</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeDiagnosis(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  Busca y agrega diagnósticos CIE-10
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Prescripción */}
          {activeTab === 2 && (
            <div className="space-y-4">

              {/* Multi-select diagnósticos para esta receta */}
              {form.diagnoses.length > 0 && (
                <div>
                  <label className="label text-xs">Diagnósticos para esta Receta</label>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {form.diagnoses.map((d, i) => {
                      const val = `${d.cie10Desc} (${d.cie10Code})`
                      const checked = form.prescriptionDiagnosis.includes(val)
                      return (
                        <label key={i} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? form.prescriptionDiagnosis.filter(v => v !== val)
                                : [...form.prescriptionDiagnosis, val]
                              update('prescriptionDiagnosis', next)
                            }}
                            className="rounded border-gray-300 dark:border-gray-600 text-primary"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{d.cie10Desc} <span className="text-gray-400">({d.cie10Code})</span></span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {form.prescriptionItems.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium min-w-[150px]">Nombre del medicamento</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium min-w-[140px]">Presentación</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium w-24">Concentración</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium w-20">Cantidad</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium min-w-[160px]">Indicación</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.prescriptionItems.map((item, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                          <td className="px-3 py-2">
                            <input
                              className="input text-sm py-1 w-full"
                              value={item.medicine}
                              onChange={(e) => {
                                const next = [...form.prescriptionItems]
                                next[i] = { ...next[i], medicine: e.target.value }
                                update('prescriptionItems', next)
                              }}
                              placeholder="Metformina"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {/* Input libre con sugerencias en vez de <select> + input oculto:
                                antes la presentación escrita a mano solo se guardaba si la
                                médica pulsaba Enter o el botón ✓, así que al imprimir directo
                                el campo llegaba vacío a la receta. Ahora cada tecla se
                                persiste en el ítem y no existe estado sin confirmar. */}
                            <input
                              className="input text-sm py-1 w-full"
                              list={`presentaciones-${i}`}
                              placeholder="Tabletas, Supositorios…"
                              value={item.presentation ?? ''}
                              onChange={(e) => {
                                const next = [...form.prescriptionItems]
                                next[i] = { ...next[i], presentation: e.target.value }
                                update('prescriptionItems', next)
                              }}
                              onBlur={(e) => addCustomPresentation(e.target.value)}
                            />
                            <datalist id={`presentaciones-${i}`}>
                              {presentationOptions.map(p => (
                                <option key={p} value={p} />
                              ))}
                            </datalist>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="input text-sm py-1 w-full"
                              value={item.dosis}
                              onChange={(e) => {
                                const next = [...form.prescriptionItems]
                                next[i] = { ...next[i], dosis: e.target.value }
                                update('prescriptionItems', next)
                              }}
                              placeholder="500mg"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="input text-sm py-1 w-full"
                              value={item.quantity}
                              onChange={(e) => {
                                const next = [...form.prescriptionItems]
                                next[i] = { ...next[i], quantity: e.target.value }
                                update('prescriptionItems', next)
                              }}
                              placeholder="30"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="input text-sm py-1 w-full"
                              value={item.indications}
                              onChange={(e) => {
                                const next = [...form.prescriptionItems]
                                next[i] = { ...next[i], indications: e.target.value }
                                update('prescriptionItems', next)
                              }}
                              placeholder="una tableta vía oral luego del desayuno"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removePrescriptionItem(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button type="button" onClick={addPrescriptionItem} className="text-sm text-primary hover:underline">
                + Agregar medicamento
              </button>

              <div className="flex gap-4 flex-wrap">
                <div>
                  <label className="label text-xs">Válida hasta</label>
                  <input
                    type="date"
                    className="input text-sm w-48"
                    value={form.prescriptionValidUntil}
                    onChange={(e) => update('prescriptionValidUntil', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label text-xs">Próxima cita</label>
                  <input
                    type="date"
                    className="input text-sm w-48"
                    value={form.prescriptionNextAppointment}
                    onChange={(e) => update('prescriptionNextAppointment', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs">Notas de prescripción</label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={6}
                  value={form.prescriptionNotes}
                  onChange={(e) => update('prescriptionNotes', e.target.value)}
                />
              </div>

              {/* Preview receta */}
              {attentionId && (
                <div className="pt-1">
                  {linkedPrescriptionId ? (
                    <a
                      href={`/prescriptions/${linkedPrescriptionId}/imprimir`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Vista previa receta
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">Guarda primero para ver el preview de la receta</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Exámenes de laboratorio */}
          {activeTab === 3 && (
            <div className="space-y-2">
              {EXAM_CATEGORIES.map((cat) => {
                const selCount = (form.exams[cat.key] as string[] | undefined)?.length ?? 0
                const otrosVal = form.otrosExams[cat.key] ?? ''
                return (
                  <details key={cat.key} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <summary className="px-4 py-3 bg-gray-50 dark:bg-gray-700/60 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300 select-none flex items-center justify-between">
                      <span>{cat.label}</span>
                      {(selCount > 0 || otrosVal) && (
                        <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                          {selCount + (otrosVal ? 1 : 0)}
                        </span>
                      )}
                    </summary>
                    <div className="px-4 py-3 bg-white dark:bg-gray-800">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {cat.exams.map((item) => (
                          <label key={item} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(form.exams[cat.key] as string[] | undefined)?.includes(item) ?? false}
                              onChange={() => toggleExam(cat.key, item)}
                              className="rounded border-gray-300 dark:border-gray-600 text-primary"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                          </label>
                        ))}
                      </div>
                      {/* OTROS field */}
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <label className="label text-xs">Otros (especificar)</label>
                        <input
                          className="input text-sm"
                          value={otrosVal}
                          onChange={(e) => update('otrosExams', { ...form.otrosExams, [cat.key]: e.target.value })}
                          placeholder="Escriba el examen a solicitar..."
                        />
                      </div>
                    </div>
                  </details>
                )
              })}

              {/* Preview orden exámenes */}
              {attentionId && (
                <div className="pt-2">
                  <a
                    href={`/attention-exams/${attentionId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Vista previa orden de exámenes
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Imágenes */}
          {activeTab === 4 && (
            <div className="space-y-2">
              {IMAGING_CATEGORIES.map((cat) => {
                const selArr = (form.exams[cat.key] as string[] | undefined) ?? []
                const otrosVal = form.otrosExams[cat.key] ?? ''

                // Helpers for special metadata fields stored inside exams JSON
                const metaKey = (field: string) => `${cat.key}__${field}`
                const getMeta = (field: string) => (form.exams[metaKey(field)] as string) ?? ''
                const setMeta = (field: string, val: string) =>
                  update('exams', { ...form.exams, [metaKey(field)]: val })

                return (
                  <details key={cat.key} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <summary className="px-4 py-3 bg-gray-50 dark:bg-gray-700/60 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300 select-none flex items-center justify-between">
                      <span>{cat.label}</span>
                      {(selArr.length > 0 || otrosVal) && (
                        <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                          {selArr.length + (otrosVal ? 1 : 0)}
                        </span>
                      )}
                    </summary>
                    <div className="px-4 py-3 bg-white dark:bg-gray-800">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {cat.exams.map((item) => (
                          <div key={item} className="col-span-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selArr.includes(item)}
                                onChange={() => toggleExam(cat.key, item)}
                                className="rounded border-gray-300 dark:border-gray-600 text-primary"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                            </label>

                            {/* Partes blandas → text input */}
                            {item === 'Partes blandas' && selArr.includes(item) && (
                              <input
                                className="input text-xs py-1 mt-1 ml-6"
                                value={getMeta('partesBlandas_texto')}
                                onChange={(e) => setMeta('partesBlandas_texto', e.target.value)}
                                placeholder="¿Qué parte blanda?"
                              />
                            )}

                            {/* Inguinal → lado */}
                            {item === 'Inguinal' && selArr.includes(item) && (
                              <div className="flex gap-3 mt-1 ml-6">
                                {['Izquierdo', 'Derecho'].map(lado => (
                                  <label key={lado} className="flex items-center gap-1 cursor-pointer text-xs text-gray-600 dark:text-gray-300">
                                    <input
                                      type="radio"
                                      name={`inguinal_lado_${cat.key}`}
                                      value={lado}
                                      checked={getMeta('inguinal_lado') === lado}
                                      onChange={() => setMeta('inguinal_lado', lado)}
                                      className="text-primary"
                                    />
                                    {lado}
                                  </label>
                                ))}
                              </div>
                            )}

                            {/* Doppler arterial → text input */}
                            {item === 'Doppler arterial' && selArr.includes(item) && (
                              <input
                                className="input text-xs py-1 mt-1 ml-6"
                                value={getMeta('dopplerArterial_texto')}
                                onChange={(e) => setMeta('dopplerArterial_texto', e.target.value)}
                                placeholder="Especificar zona..."
                              />
                            )}

                            {/* Ecografía mamaria unilateral → lado */}
                            {item === 'Ecografía mamaria unilateral' && selArr.includes(item) && (
                              <div className="flex gap-3 mt-1 ml-6">
                                {['Derecha', 'Izquierda'].map(lado => (
                                  <label key={lado} className="flex items-center gap-1 cursor-pointer text-xs text-gray-600 dark:text-gray-300">
                                    <input
                                      type="radio"
                                      name={`mamariaUnilateral_lado_${cat.key}`}
                                      value={lado}
                                      checked={getMeta('mamariaUnilateral_lado') === lado}
                                      onChange={() => setMeta('mamariaUnilateral_lado', lado)}
                                      className="text-primary"
                                    />
                                    {lado}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* OTROS field */}
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <label className="label text-xs">Otros (especificar)</label>
                        <input
                          className="input text-sm"
                          value={otrosVal}
                          onChange={(e) => update('otrosExams', { ...form.otrosExams, [cat.key]: e.target.value })}
                          placeholder="Escriba el estudio a solicitar..."
                        />
                      </div>
                    </div>
                  </details>
                )
              })}

              {/* Preview orden imágenes */}
              {attentionId && (
                <div className="pt-2">
                  <a
                    href={`/attention-images/${attentionId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Vista previa orden de imágenes
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Tab 6: Certificados */}
          {activeTab === 5 && (
            <CertificadosTab
              patientId={patientId}
              attentionId={attentionId}
              diagnoses={form.diagnoses}
            />
          )}

          {/* Tab 7: Facturación */}
          {activeTab === 6 && (
            <div className="space-y-4">
              {form.billing.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium">Descripción</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium">Cantidad</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium">Precio Unit.</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium">Subtotal</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.billing.map((item, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                          <td className="px-3 py-2">
                            <input
                              list={`billing-services-${i}`}
                              className="input text-sm py-1"
                              value={item.description}
                              onChange={(e) => {
                                const next = [...form.billing]
                                next[i] = { ...next[i], description: e.target.value }
                                update('billing', next)
                              }}
                              placeholder="Servicio o producto"
                            />
                            {doctorServices.length > 0 && (
                              <datalist id={`billing-services-${i}`}>
                                {doctorServices.map(svc => (
                                  <option key={svc} value={svc} />
                                ))}
                              </datalist>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              className="input text-sm py-1 w-20"
                              value={item.quantity}
                              min={1}
                              onChange={(e) => {
                                const next = [...form.billing]
                                next[i] = { ...next[i], quantity: Number(e.target.value) }
                                update('billing', next)
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              className="input text-sm py-1 w-24"
                              value={item.unitPrice}
                              min={0}
                              step="0.01"
                              onChange={(e) => {
                                const next = [...form.billing]
                                next[i] = { ...next[i], unitPrice: Number(e.target.value) }
                                update('billing', next)
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeBillingItem(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/60">
                        <td colSpan={3} className="px-3 py-2 text-sm font-semibold text-right text-gray-700 dark:text-gray-300">
                          Total:
                        </td>
                        <td className="px-3 py-2 text-sm font-bold text-gray-900 dark:text-white">
                          ${billingTotal.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <button type="button" onClick={addBillingItem} className="text-sm text-primary hover:underline">
                + Agregar ítem
              </button>

              <div>
                <label className="label text-xs">Estado de pago</label>
                <select
                  className="input text-sm"
                  value={form.billingStatus}
                  onChange={(e) => update('billingStatus', e.target.value)}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagado">Pagado</option>
                  <option value="Anulado">Anulado</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 py-2.5 disabled:opacity-60 flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Guardando...
            </>
          ) : (
            '💾 Guardar'
          )}
        </button>
        <button
          onClick={handleExit}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          🚪 Salir
        </button>
        <span className="text-xs text-gray-400 dark:text-slate-400 ml-auto">
          ⏱ {elapsedMins}m en consulta
        </span>
      </div>

      {/* Attachment preview modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                {previewAttachment.description || 'Adjunto'}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.description || 'adjunto'}
                  className="text-xs text-primary hover:underline px-2 py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  ⬇ Descargar
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 dark:bg-gray-800 p-4">
              {previewAttachment.url.startsWith('data:image') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.description}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl"
                />
              ) : (
                <iframe
                  src={previewAttachment.url}
                  title={previewAttachment.description}
                  className="w-full h-[70vh] rounded-xl border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-in slide-in-from-bottom-4 duration-300 ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          <span>{toast.ok ? '✓' : '✕'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}
