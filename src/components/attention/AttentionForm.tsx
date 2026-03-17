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
  attentionType: string
  insurance: string
  fecha: string
  hora: string
  nextAppointment: string
  motive: string
  evolution: string
  exploration: ExplorationData
  diagnoses: Diagnosis[]
  prescriptionItems: PrescriptionItem[]
  prescriptionValidUntil: string
  prescriptionNotes: string
  exams: Record<string, string[]>
  images: { url: string; description: string }[]
  billing: BillingItem[]
  billingStatus: string
}

interface Cie10Result {
  code: string
  description: string
}

// Imported from shared lib to keep consistent with ÓRDENES section
import { EXAM_CATEGORIES } from '@/lib/exam-categories'

const TABS = ['Exploración', 'Diagnóstico', 'Prescripción', 'Exámenes', 'Imágenes', 'Facturación']

function defaultExploration(): ExplorationData {
  return {
    peso: '', talla: '', imc: '',
    pasSistolica: '', pasDiastolica: '',
    frecuenciaCardiaca: '', frecuenciaRespiratoria: '',
    temperatura: '', saturacionO2: '', perimetroCefalico: '',
    cabezaCuello: '', torax: '', abdomen: '', extremidades: '',
    neurologico: '', observacionesGenerales: '',
  }
}

function defaultExams(): Record<string, string[]> {
  const exams: Record<string, string[]> = {}
  for (const cat of EXAM_CATEGORIES) exams[cat.key] = []
  return exams
}

// ─── AI Analysis Modal ───────────────────────────────────────────────────────

function AIModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState('')
  const [sources, setSources] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/patients/${patientId}/ai-analysis`, { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        setAnalysis(data.analysis ?? '')
        setSources(data.sources ?? [])
      })
      .catch(() => setError('Error al conectar con Sara IA'))
      .finally(() => setLoading(false))
  }, [patientId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h3 className="font-bold text-gray-900 dark:text-white">Análisis de Sara IA</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-sm text-gray-500 dark:text-slate-300">Sara está analizando la historia clínica...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-sm">
              {error}
            </div>
          ) : (
            <>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {analysis}
                </pre>
              </div>
              {sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wide mb-2">
                    Fuentes consultadas
                  </p>
                  <ul className="space-y-1">
                    {sources.map((s) => (
                      <li key={s} className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                        <span>📄</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="btn-primary w-full py-2">Cerrar</button>
        </div>
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
}

export default function AttentionForm({ patientId, attentionId, initialData, previousAttention }: Props) {
  const router = useRouter()
  const startTimeRef = useRef(Date.now())
  const [elapsedMins, setElapsedMins] = useState(0)
  const [activeTab, setActiveTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [showPrevious, setShowPrevious] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // CIE10 search
  const [cie10Query, setCie10Query] = useState('')
  const [cie10Results, setCie10Results] = useState<Cie10Result[]>([])
  const [cie10Loading, setCie10Loading] = useState(false)

  // Image upload
  const imageInputRef = useRef<HTMLInputElement>(null)

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const timeStr = now.toTimeString().slice(0, 5)

  const [form, setForm] = useState<AttentionData>({
    establishment: '',
    service: 'Consulta',
    attentionType: '',
    insurance: '',
    fecha: todayStr,
    hora: timeStr,
    nextAppointment: '',
    motive: '',
    evolution: '',
    exploration: defaultExploration(),
    diagnoses: [],
    prescriptionItems: [],
    prescriptionValidUntil: '',
    prescriptionNotes: 'Recomendaciones:\nSignos de Alarma:\nAlergias:',
    exams: defaultExams(),
    images: [],
    billing: [],
    billingStatus: 'Pendiente',
    ...initialData,
  })

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
        const res = await fetch(`/api/cie10?q=${encodeURIComponent(cie10Query)}`)
        const data = await res.json()
        setCie10Results(data.results ?? [])
      } finally {
        setCie10Loading(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [cie10Query])

  function addDiagnosis(code: string, desc: string) {
    const newDiag: Diagnosis = { cie10Code: code, cie10Desc: desc, observations: '', isNew: true, isDefinitive: false }
    update('diagnoses', [...form.diagnoses, newDiag])
    setCie10Query('')
    setCie10Results([])
  }

  function removeDiagnosis(index: number) {
    update('diagnoses', form.diagnoses.filter((_, i) => i !== index))
  }

  function addPrescriptionItem() {
    update('prescriptionItems', [...form.prescriptionItems, { medicine: '', quantity: '', indications: '' }])
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
    const current = form.exams[categoryKey] ?? []
    const next = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item]
    update('exams', { ...form.exams, [categoryKey]: next })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
      const payload = {
        establishment: form.establishment || null,
        service: form.service || null,
        attentionType: form.attentionType || null,
        insurance: form.insurance || null,
        datetime,
        nextAppointment: form.nextAppointment || null,
        durationMins: elapsedMins > 0 ? elapsedMins : null,
        motive: form.motive || null,
        evolution: form.evolution || null,
        exploration: form.exploration,
        diagnoses: form.diagnoses,
        prescriptionData: {
          items: form.prescriptionItems,
          validUntil: form.prescriptionValidUntil || null,
          notes: form.prescriptionNotes || null,
        },
        exams: form.exams,
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
      router.push(`/patients/${patientId}/atenciones/${savedId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
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
      {showAI && <AIModal patientId={patientId} onClose={() => setShowAI(false)} />}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          {error}
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
              <input
                className="input text-sm py-1.5"
                value={form.establishment}
                onChange={(e) => update('establishment', e.target.value)}
                placeholder="Clínica, hospital..."
              />
            </div>
            <div>
              <label className="label text-xs">Servicio</label>
              <select
                className="input text-sm py-1.5"
                value={form.service}
                onChange={(e) => update('service', e.target.value)}
              >
                <option value="Consulta">Consulta</option>
                <option value="Emergencia">Emergencia</option>
                <option value="Hospitalización">Hospitalización</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Tipo de atención</label>
              <input
                className="input text-sm py-1.5"
                value={form.attentionType}
                onChange={(e) => update('attentionType', e.target.value)}
                placeholder="Primera vez, control..."
              />
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
            <div className="col-span-2">
              <label className="label text-xs">Próxima cita</label>
              <input
                type="date"
                className="input text-sm py-1.5"
                value={form.nextAppointment}
                onChange={(e) => update('nextAppointment', e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAI(true)}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-400 text-sm font-medium rounded-xl transition-colors"
          >
            🤖 Analizar con Sara IA
          </button>

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
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-600 dark:text-slate-300 space-y-1">
                  {previousAttention.motive && <p><strong>Motivo:</strong> {previousAttention.motive}</p>}
                  {previousAttention.evolution && <p><strong>Evolución:</strong> {previousAttention.evolution}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Motivo y evolución</h3>
          <div>
            <label className="label text-xs">Motivo de la atención actual</label>
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
              <label className="label text-xs mb-0">Evolución</label>
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
              placeholder="Evolución del paciente..."
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
                  Exploración Regional
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {([
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
            </div>
          )}

          {/* Tab 2: Diagnóstico */}
          {activeTab === 1 && (
            <div className="space-y-4">
              {/* CIE-10 search */}
              <div className="relative">
                <label className="label text-xs">Buscar diagnóstico CIE-10</label>
                <input
                  className="input text-sm"
                  value={cie10Query}
                  onChange={(e) => setCie10Query(e.target.value)}
                  placeholder="Ej: hipertensión, J45, diabetes..."
                />
                {cie10Loading && (
                  <div className="absolute right-3 top-8">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
                {cie10Results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                    {cie10Results.map((result) => (
                      <button
                        key={result.code}
                        type="button"
                        onClick={() => addDiagnosis(result.code, result.description)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0"
                      >
                        <span className="font-mono text-primary text-xs mr-2">{result.code}</span>
                        <span className="text-gray-700 dark:text-gray-300">{result.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Diagnoses table */}
              {form.diagnoses.length > 0 ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium">Código</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium">Descripción</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-slate-300 font-medium">Observaciones</th>
                        <th className="px-3 py-2 text-center text-xs text-gray-500 dark:text-slate-300 font-medium">Nuevo</th>
                        <th className="px-3 py-2 text-center text-xs text-gray-500 dark:text-slate-300 font-medium">Definitivo</th>
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
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={d.isNew}
                              onChange={(e) => {
                                const next = [...form.diagnoses]
                                next[i] = { ...next[i], isNew: e.target.checked }
                                update('diagnoses', next)
                              }}
                              className="rounded text-primary"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={d.isDefinitive}
                              onChange={(e) => {
                                const next = [...form.diagnoses]
                                next[i] = { ...next[i], isDefinitive: e.target.checked }
                                update('diagnoses', next)
                              }}
                              className="rounded text-primary"
                            />
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
              {form.prescriptionItems.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Medicamento</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Cantidad</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Indicaciones</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.prescriptionItems.map((item, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                          <td className="px-3 py-2">
                            <input
                              className="input text-sm py-1"
                              value={item.medicine}
                              onChange={(e) => {
                                const next = [...form.prescriptionItems]
                                next[i] = { ...next[i], medicine: e.target.value }
                                update('prescriptionItems', next)
                              }}
                              placeholder="Nombre del medicamento"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="input text-sm py-1 w-24"
                              value={item.quantity}
                              onChange={(e) => {
                                const next = [...form.prescriptionItems]
                                next[i] = { ...next[i], quantity: e.target.value }
                                update('prescriptionItems', next)
                              }}
                              placeholder="Cantidad"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="input text-sm py-1"
                              value={item.indications}
                              onChange={(e) => {
                                const next = [...form.prescriptionItems]
                                next[i] = { ...next[i], indications: e.target.value }
                                update('prescriptionItems', next)
                              }}
                              placeholder="Dosis, frecuencia..."
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs">Válida hasta</label>
                  <input
                    type="date"
                    className="input text-sm"
                    value={form.prescriptionValidUntil}
                    onChange={(e) => update('prescriptionValidUntil', e.target.value)}
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
            </div>
          )}

          {/* Tab 4: Exámenes */}
          {activeTab === 3 && (
            <div className="space-y-2">
              {EXAM_CATEGORIES.map((cat) => (
                <details key={cat.key} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <summary className="px-4 py-3 bg-gray-50 dark:bg-gray-750 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300 select-none flex items-center justify-between">
                    <span>{cat.label}</span>
                    {(form.exams[cat.key]?.length ?? 0) > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {form.exams[cat.key].length}
                      </span>
                    )}
                  </summary>
                  <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-2 bg-white dark:bg-gray-800">
                    {cat.exams.map((item) => (
                      <label key={item} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.exams[cat.key]?.includes(item) ?? false}
                          onChange={() => toggleExam(cat.key, item)}
                          className="rounded border-gray-300 dark:border-gray-600 text-primary"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}

          {/* Tab 5: Imágenes */}
          {activeTab === 4 && (
            <div className="space-y-4">
              <div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl py-8 flex flex-col items-center justify-center gap-2 hover:border-primary dark:hover:border-primary transition-colors"
                >
                  <span className="text-3xl">📎</span>
                  <span className="text-sm text-gray-500 dark:text-slate-300">
                    Clic para subir imágenes o PDFs
                  </span>
                  <span className="text-xs text-gray-400">PNG, JPG, PDF</span>
                </button>
              </div>

              {form.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      {img.url.startsWith('data:image') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.url} alt={img.description} className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-3xl">📄</span>
                        </div>
                      )}
                      <div className="p-2">
                        <input
                          className="input text-xs py-1"
                          value={img.description}
                          onChange={(e) => {
                            const next = [...form.images]
                            next[i] = { ...next[i], description: e.target.value }
                            update('images', next)
                          }}
                          placeholder="Descripción..."
                        />
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
            </div>
          )}

          {/* Tab 6: Facturación */}
          {activeTab === 5 && (
            <div className="space-y-4">
              {form.billing.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Descripción</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Cantidad</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Precio Unit.</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Subtotal</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.billing.map((item, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                          <td className="px-3 py-2">
                            <input
                              className="input text-sm py-1"
                              value={item.description}
                              onChange={(e) => {
                                const next = [...form.billing]
                                next[i] = { ...next[i], description: e.target.value }
                                update('billing', next)
                              }}
                              placeholder="Servicio o producto"
                            />
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
                      <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
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
    </div>
  )
}
