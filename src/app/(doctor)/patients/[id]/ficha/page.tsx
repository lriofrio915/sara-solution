'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PatientData {
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
}

interface ChartData {
  sex: string
  maritalStatus: string
  education: string
  province: string
  city: string
  category: string
  occupation: string
  referredBy: string
  address: string
  admissionDate: string
  insurance: string
  patientStatus: string
  alert1: string
  alert2: string
  alert3: string
  tutorName: string
  tutorRelation: string
  tutorPhone: string
  tutorEmail: string
  heredoFamiliar: HeredoFamiliar
  personalPathologic: PersonalPathologic
  personalNonPathologic: PersonalNonPathologic
  gynecoObstetric: GynecoObstetric
  dentalHabits: DentalHabits
  stimulation: Stimulation
}

interface HeredoFamiliar {
  diabetes: boolean
  hipertension: boolean
  cancer: boolean
  cardiopatias: boolean
  enfermedadesMentales: boolean
  enfermedadesRenales: boolean
  obesidad: boolean
  epilepsia: boolean
  asma: boolean
  otros: boolean
  notas: string
}

interface PersonalPathologic {
  enfermedadesPrevias: string
  cirugias: string
  hospitalizaciones: string
  alergias: string
  medicacionActual: string
}

interface PersonalNonPathologic {
  tabaco: string
  tabacoFrecuencia: string
  alcohol: string
  alcoholFrecuencia: string
  drogas: string
  ejercicio: string
  alimentacion: string
  sueno: string
}

interface GynecoObstetric {
  menarquia: string
  ciclosDias: string
  fum: string
  gestas: string
  partos: string
  abortos: string
  cesareas: string
  anticonceptivos: string
}

interface DentalHabits {
  frecuenciaCepillado: string
  hiloNecklace: boolean
  ultimaVisita: string
}

interface Stimulation {
  notas: string
}

// ─── Default form values ──────────────────────────────────────────────────────

const defaultChart: ChartData = {
  sex: '',
  maritalStatus: '',
  education: '',
  province: '',
  city: '',
  category: '',
  occupation: '',
  referredBy: '',
  address: '',
  admissionDate: '',
  insurance: '',
  patientStatus: '',
  alert1: '',
  alert2: '',
  alert3: '',
  tutorName: '',
  tutorRelation: '',
  tutorPhone: '',
  tutorEmail: '',
  heredoFamiliar: {
    diabetes: false, hipertension: false, cancer: false, cardiopatias: false,
    enfermedadesMentales: false, enfermedadesRenales: false, obesidad: false,
    epilepsia: false, asma: false, otros: false, notas: '',
  },
  personalPathologic: {
    enfermedadesPrevias: '', cirugias: '', hospitalizaciones: '',
    alergias: '', medicacionActual: '',
  },
  personalNonPathologic: {
    tabaco: 'No', tabacoFrecuencia: '', alcohol: 'No', alcoholFrecuencia: '',
    drogas: '', ejercicio: 'Sedentario', alimentacion: '', sueno: 'Normal',
  },
  gynecoObstetric: {
    menarquia: '', ciclosDias: '', fum: '', gestas: '', partos: '',
    abortos: '', cesareas: '', anticonceptivos: '',
  },
  dentalHabits: {
    frecuenciaCepillado: '2 veces al día', hiloNecklace: false, ultimaVisita: '',
  },
  stimulation: { notas: '' },
}

// ─── Helper functions ────────────────────────────────────────────────────────

function calcDetailedAge(birthDate: string | null): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  let days = now.getDate() - birth.getDate()
  if (days < 0) { months--; days += 30 }
  if (months < 0) { years--; months += 12 }
  if (years > 0) return `${years} años, ${months} meses`
  if (months > 0) return `${months} meses, ${days} días`
  return `${days} días`
}

// ─── Accordion component ─────────────────────────────────────────────────────

function Accordion({ title, children, defaultOpen = false }: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
      >
        <span>{title}</span>
        <span className="text-gray-400 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
          ▼
        </span>
      </button>
      {open && (
        <div className="p-4 bg-white dark:bg-gray-800 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FichaPage() {
  const { id } = useParams<{ id: string }>()
  const [patient, setPatient] = useState<PatientData | null>(null)
  const [chart, setChart] = useState<ChartData>(defaultChart)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [patRes, chartRes] = await Promise.all([
        fetch(`/api/patients/${id}`),
        fetch(`/api/patients/${id}/chart`),
      ])
      const { patient: p } = await patRes.json()
      const { chart: c } = await chartRes.json()
      setPatient(p)
      if (c) {
        setChart({
          sex: c.sex ?? '',
          maritalStatus: c.maritalStatus ?? '',
          education: c.education ?? '',
          province: c.province ?? '',
          city: c.city ?? '',
          category: c.category ?? '',
          occupation: c.occupation ?? '',
          referredBy: c.referredBy ?? '',
          address: c.address ?? '',
          admissionDate: c.admissionDate ? c.admissionDate.slice(0, 10) : '',
          insurance: c.insurance ?? '',
          patientStatus: c.patientStatus ?? '',
          alert1: c.alert1 ?? '',
          alert2: c.alert2 ?? '',
          alert3: c.alert3 ?? '',
          tutorName: c.tutorName ?? '',
          tutorRelation: c.tutorRelation ?? '',
          tutorPhone: c.tutorPhone ?? '',
          tutorEmail: c.tutorEmail ?? '',
          heredoFamiliar: c.heredoFamiliar ?? defaultChart.heredoFamiliar,
          personalPathologic: c.personalPathologic ?? defaultChart.personalPathologic,
          personalNonPathologic: c.personalNonPathologic ?? defaultChart.personalNonPathologic,
          gynecoObstetric: c.gynecoObstetric ?? defaultChart.gynecoObstetric,
          dentalHabits: c.dentalHabits ?? defaultChart.dentalHabits,
          stimulation: c.stimulation ?? defaultChart.stimulation,
        })
      }
    } catch {
      setError('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/patients/${id}/chart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...chart,
          admissionDate: chart.admissionDate || null,
        }),
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

  function updateChart(field: keyof ChartData, value: unknown) {
    setChart((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  if (!patient) return (
    <div className="p-4">
      <p className="text-red-600">{error ?? 'Paciente no encontrado'}</p>
    </div>
  )

  const age = calcDetailedAge(patient.birthDate)
  const hasAlerts = chart.alert1 || chart.alert2 || chart.alert3

  return (
    <div className="max-w-7xl">
      {/* Alerts banner */}
      {hasAlerts && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">⚠️ Alertas del paciente</p>
          <div className="space-y-0.5">
            {chart.alert1 && <p className="text-sm text-red-600 dark:text-red-300">{chart.alert1}</p>}
            {chart.alert2 && <p className="text-sm text-red-600 dark:text-red-300">{chart.alert2}</p>}
            {chart.alert3 && <p className="text-sm text-red-600 dark:text-red-300">{chart.alert3}</p>}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Left Column: Personal Data ─────────────────────────────── */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-4">
              Datos Personales
            </h2>
            <div className="space-y-4">
              {/* Document */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo documento</label>
                  <input
                    className="input text-sm"
                    value={patient.documentType ?? ''}
                    readOnly
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="label">Número documento</label>
                  <input
                    className="input text-sm"
                    value={patient.documentId ?? ''}
                    readOnly
                    placeholder="—"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="label">Nombre completo</label>
                <input className="input text-sm" value={patient.name} readOnly />
              </div>

              {/* Birth date + Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Fecha de nacimiento</label>
                  <input
                    className="input text-sm"
                    value={patient.birthDate ? patient.birthDate.slice(0, 10) : ''}
                    readOnly
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="label">Edad</label>
                  <input className="input text-sm bg-gray-50 dark:bg-gray-700" value={age} readOnly />
                </div>
              </div>

              {/* Sex */}
              <div>
                <label className="label">Sexo</label>
                <select
                  className="input text-sm"
                  value={chart.sex}
                  onChange={(e) => updateChart('sex', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Marital status */}
              <div>
                <label className="label">Estado civil</label>
                <select
                  className="input text-sm"
                  value={chart.maritalStatus}
                  onChange={(e) => updateChart('maritalStatus', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Soltero/a">Soltero/a</option>
                  <option value="Casado/a">Casado/a</option>
                  <option value="Divorciado/a">Divorciado/a</option>
                  <option value="Viudo/a">Viudo/a</option>
                  <option value="Unión libre">Unión libre</option>
                </select>
              </div>

              {/* Education */}
              <div>
                <label className="label">Nivel de educación</label>
                <select
                  className="input text-sm"
                  value={chart.education}
                  onChange={(e) => updateChart('education', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Sin estudios">Sin estudios</option>
                  <option value="Primaria">Primaria</option>
                  <option value="Secundaria">Secundaria</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Universitario">Universitario</option>
                  <option value="Posgrado">Posgrado</option>
                </select>
              </div>

              {/* Province / City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Provincia</label>
                  <input
                    className="input text-sm"
                    value={chart.province}
                    onChange={(e) => updateChart('province', e.target.value)}
                    placeholder="Provincia"
                  />
                </div>
                <div>
                  <label className="label">Ciudad</label>
                  <input
                    className="input text-sm"
                    value={chart.city}
                    onChange={(e) => updateChart('city', e.target.value)}
                    placeholder="Ciudad"
                  />
                </div>
              </div>

              {/* Category / Occupation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoría</label>
                  <input
                    className="input text-sm"
                    value={chart.category}
                    onChange={(e) => updateChart('category', e.target.value)}
                    placeholder="Categoría"
                  />
                </div>
                <div>
                  <label className="label">Ocupación</label>
                  <input
                    className="input text-sm"
                    value={chart.occupation}
                    onChange={(e) => updateChart('occupation', e.target.value)}
                    placeholder="Ocupación"
                  />
                </div>
              </div>

              {/* Referred by */}
              <div>
                <label className="label">Referido por</label>
                <input
                  className="input text-sm"
                  value={chart.referredBy}
                  onChange={(e) => updateChart('referredBy', e.target.value)}
                  placeholder="Nombre o institución"
                />
              </div>

              {/* Admission date */}
              <div>
                <label className="label">Fecha de ingreso</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={chart.admissionDate}
                  onChange={(e) => updateChart('admissionDate', e.target.value)}
                />
              </div>

              {/* Address */}
              <div>
                <label className="label">Dirección</label>
                <input
                  className="input text-sm"
                  value={chart.address}
                  onChange={(e) => updateChart('address', e.target.value)}
                  placeholder="Dirección completa"
                />
              </div>

              {/* Phone / Email (read from patient) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Teléfono / Celular</label>
                  <input className="input text-sm" value={patient.phone ?? ''} readOnly placeholder="—" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input text-sm" value={patient.email ?? ''} readOnly placeholder="—" />
                </div>
              </div>

              {/* Insurance */}
              <div>
                <label className="label">Seguro médico</label>
                <input
                  className="input text-sm"
                  value={chart.insurance}
                  onChange={(e) => updateChart('insurance', e.target.value)}
                  placeholder="Nombre del seguro"
                />
              </div>

              {/* Patient status */}
              <div>
                <label className="label">Estado del paciente</label>
                <select
                  className="input text-sm"
                  value={chart.patientStatus}
                  onChange={(e) => updateChart('patientStatus', e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="AMBULATORIO">Ambulatorio</option>
                  <option value="HOSPITALARIO">Hospitalario</option>
                  <option value="FALLECIDO">Fallecido</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Column: Accordions ────────────────────────────────── */}
        <div className="space-y-3">
          {/* A) Alerts */}
          <Accordion title="⚠️ Alertas" defaultOpen={true}>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Las alertas con contenido se muestran en rojo en el encabezado del paciente.
            </p>
            {(['alert1', 'alert2', 'alert3'] as const).map((key, i) => (
              <div key={key}>
                <label className="label">Alerta {i + 1}</label>
                <input
                  className={`input text-sm ${chart[key] ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300' : ''}`}
                  value={chart[key]}
                  onChange={(e) => updateChart(key, e.target.value)}
                  placeholder={`Alerta ${i + 1} (opcional)`}
                />
              </div>
            ))}
          </Accordion>

          {/* B) Tutor */}
          <Accordion title="👤 Datos del Tutor / Representante">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre del tutor</label>
                <input
                  className="input text-sm"
                  value={chart.tutorName}
                  onChange={(e) => updateChart('tutorName', e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="label">Parentesco</label>
                <input
                  className="input text-sm"
                  value={chart.tutorRelation}
                  onChange={(e) => updateChart('tutorRelation', e.target.value)}
                  placeholder="Madre, padre, etc."
                />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input
                  className="input text-sm"
                  value={chart.tutorPhone}
                  onChange={(e) => updateChart('tutorPhone', e.target.value)}
                  placeholder="Teléfono del tutor"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input text-sm"
                  value={chart.tutorEmail}
                  onChange={(e) => updateChart('tutorEmail', e.target.value)}
                  placeholder="Email del tutor"
                />
              </div>
            </div>
          </Accordion>

          {/* C) Heredo-familiar */}
          <Accordion title="🧬 Antecedentes Heredo-Familiares">
            <div className="grid grid-cols-2 gap-2">
              {([
                ['diabetes', 'Diabetes'],
                ['hipertension', 'Hipertensión'],
                ['cancer', 'Cáncer'],
                ['cardiopatias', 'Cardiopatías'],
                ['enfermedadesMentales', 'Enf. Mentales'],
                ['enfermedadesRenales', 'Enf. Renales'],
                ['obesidad', 'Obesidad'],
                ['epilepsia', 'Epilepsia'],
                ['asma', 'Asma'],
                ['otros', 'Otros'],
              ] as [keyof HeredoFamiliar, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chart.heredoFamiliar[key] as boolean}
                    onChange={(e) => updateChart('heredoFamiliar', {
                      ...chart.heredoFamiliar, [key]: e.target.checked,
                    })}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={3}
                value={chart.heredoFamiliar.notas}
                onChange={(e) => updateChart('heredoFamiliar', { ...chart.heredoFamiliar, notas: e.target.value })}
                placeholder="Detalles adicionales..."
              />
            </div>
          </Accordion>

          {/* D) Personal pathologic */}
          <Accordion title="🏥 Antecedentes Personales Patológicos">
            {([
              ['enfermedadesPrevias', 'Enfermedades previas'],
              ['cirugias', 'Cirugías'],
              ['hospitalizaciones', 'Hospitalizaciones'],
              ['alergias', 'Alergias'],
              ['medicacionActual', 'Medicación actual'],
            ] as [keyof PersonalPathologic, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={2}
                  value={chart.personalPathologic[key]}
                  onChange={(e) => updateChart('personalPathologic', { ...chart.personalPathologic, [key]: e.target.value })}
                  placeholder={label}
                />
              </div>
            ))}
          </Accordion>

          {/* E) Personal non-pathologic */}
          <Accordion title="🌿 Antecedentes Personales No Patológicos">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tabaco</label>
                <select
                  className="input text-sm"
                  value={chart.personalNonPathologic.tabaco}
                  onChange={(e) => updateChart('personalNonPathologic', { ...chart.personalNonPathologic, tabaco: e.target.value })}
                >
                  <option value="No">No</option>
                  <option value="Ex-fumador">Ex-fumador</option>
                  <option value="Fumador actual">Fumador actual</option>
                </select>
              </div>
              {chart.personalNonPathologic.tabaco !== 'No' && (
                <div>
                  <label className="label">Frecuencia tabaco</label>
                  <input
                    className="input text-sm"
                    value={chart.personalNonPathologic.tabacoFrecuencia}
                    onChange={(e) => updateChart('personalNonPathologic', { ...chart.personalNonPathologic, tabacoFrecuencia: e.target.value })}
                    placeholder="ej: 5 cigarrillos/día"
                  />
                </div>
              )}
              <div>
                <label className="label">Alcohol</label>
                <select
                  className="input text-sm"
                  value={chart.personalNonPathologic.alcohol}
                  onChange={(e) => updateChart('personalNonPathologic', { ...chart.personalNonPathologic, alcohol: e.target.value })}
                >
                  <option value="No">No</option>
                  <option value="Ocasional">Ocasional</option>
                  <option value="Moderado">Moderado</option>
                  <option value="Frecuente">Frecuente</option>
                </select>
              </div>
              {chart.personalNonPathologic.alcohol !== 'No' && (
                <div>
                  <label className="label">Frecuencia alcohol</label>
                  <input
                    className="input text-sm"
                    value={chart.personalNonPathologic.alcoholFrecuencia}
                    onChange={(e) => updateChart('personalNonPathologic', { ...chart.personalNonPathologic, alcoholFrecuencia: e.target.value })}
                    placeholder="ej: fines de semana"
                  />
                </div>
              )}
              <div>
                <label className="label">Ejercicio</label>
                <select
                  className="input text-sm"
                  value={chart.personalNonPathologic.ejercicio}
                  onChange={(e) => updateChart('personalNonPathologic', { ...chart.personalNonPathologic, ejercicio: e.target.value })}
                >
                  <option value="Sedentario">Sedentario</option>
                  <option value="Leve">Leve</option>
                  <option value="Moderado">Moderado</option>
                  <option value="Intenso">Intenso</option>
                </select>
              </div>
              <div>
                <label className="label">Sueño</label>
                <select
                  className="input text-sm"
                  value={chart.personalNonPathologic.sueno}
                  onChange={(e) => updateChart('personalNonPathologic', { ...chart.personalNonPathologic, sueno: e.target.value })}
                >
                  <option value="Normal">Normal</option>
                  <option value="Insomnio">Insomnio</option>
                  <option value="Hipersomnia">Hipersomnia</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Drogas</label>
              <textarea
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={2}
                value={chart.personalNonPathologic.drogas}
                onChange={(e) => updateChart('personalNonPathologic', { ...chart.personalNonPathologic, drogas: e.target.value })}
                placeholder="Sustancias psicoactivas..."
              />
            </div>
            <div>
              <label className="label">Alimentación</label>
              <textarea
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={2}
                value={chart.personalNonPathologic.alimentacion}
                onChange={(e) => updateChart('personalNonPathologic', { ...chart.personalNonPathologic, alimentacion: e.target.value })}
                placeholder="Descripción de hábitos alimenticios..."
              />
            </div>
          </Accordion>

          {/* F) Gineco-obstetric (only if female) */}
          {(chart.sex === 'Femenino' || chart.sex === '') && (
            <Accordion title="🌸 Antecedentes Gineco-Obstétricos">
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['menarquia', 'Menarquia (años)'],
                  ['ciclosDias', 'Ciclos (días)'],
                  ['fum', 'FUM'],
                  ['gestas', 'Gestas'],
                  ['partos', 'Partos'],
                  ['abortos', 'Abortos'],
                  ['cesareas', 'Cesáreas'],
                  ['anticonceptivos', 'Anticonceptivos'],
                ] as [keyof GynecoObstetric, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input
                      className="input text-sm"
                      value={chart.gynecoObstetric[key]}
                      onChange={(e) => updateChart('gynecoObstetric', { ...chart.gynecoObstetric, [key]: e.target.value })}
                      placeholder={label}
                    />
                  </div>
                ))}
              </div>
            </Accordion>
          )}

          {/* G) Dental habits */}
          <Accordion title="🦷 Hábitos Odontológicos">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Frecuencia de cepillado</label>
                <select
                  className="input text-sm"
                  value={chart.dentalHabits.frecuenciaCepillado}
                  onChange={(e) => updateChart('dentalHabits', { ...chart.dentalHabits, frecuenciaCepillado: e.target.value })}
                >
                  <option value="1 vez al día">1 vez al día</option>
                  <option value="2 veces al día">2 veces al día</option>
                  <option value="3 veces al día">3 veces al día</option>
                  <option value="Irregular">Irregular</option>
                  <option value="No cepilla">No cepilla</option>
                </select>
              </div>
              <div>
                <label className="label">Última visita odontológica</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={chart.dentalHabits.ultimaVisita}
                  onChange={(e) => updateChart('dentalHabits', { ...chart.dentalHabits, ultimaVisita: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={chart.dentalHabits.hiloNecklace}
                onChange={(e) => updateChart('dentalHabits', { ...chart.dentalHabits, hiloNecklace: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600 text-primary"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Usa hilo dental</span>
            </label>
          </Accordion>

          {/* H) Stimulation */}
          <Accordion title="🧒 Estimulación Psicomotora (Pediátrico)">
            <div>
              <label className="label">Desarrollo psicomotor</label>
              <textarea
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={4}
                value={chart.stimulation.notas}
                onChange={(e) => updateChart('stimulation', { notas: e.target.value })}
                placeholder="Describa el desarrollo psicomotor del paciente..."
              />
            </div>
          </Accordion>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 py-2.5 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : '💾 Guardar ficha'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            ✓ Ficha guardada correctamente
          </span>
        )}
      </div>
    </div>
  )
}
