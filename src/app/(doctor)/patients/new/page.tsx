'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { validateCedula } from '@/lib/cedula-ec'

const BLOOD_TYPES = ['UNKNOWN', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const BLOOD_LABELS: Record<string, string> = {
  UNKNOWN: 'Desconocido', A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

type LookupState = 'idle' | 'loading' | 'found' | 'valid' | 'invalid'

export default function NewPatientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allergyInput, setAllergyInput] = useState('')

  // Lookup state
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [lookupMsg, setLookupMsg] = useState('')
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null)
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    documentId: '',
    documentType: 'cedula',
    bloodType: 'UNKNOWN',
    notes: '',
    allergies: [] as string[],
  })

  // Auto-lookup when documentId changes (cedula = 10 digits)
  useEffect(() => {
    const id = form.documentId.trim()

    if (lookupTimer.current) clearTimeout(lookupTimer.current)

    // Only validate/lookup for Ecuadorian cédulas
    if (form.documentType !== 'cedula') {
      setLookupState('idle')
      setLookupMsg('')
      return
    }

    if (id.length < 10) {
      setLookupState('idle')
      setLookupMsg('')
      return
    }

    // Quick client-side validation first
    const validation = validateCedula(id)
    if (!validation.valid) {
      setLookupState('invalid')
      setLookupMsg(validation.error)
      return
    }

    // Debounce server lookup
    lookupTimer.current = setTimeout(async () => {
      setLookupState('loading')
      setLookupMsg('Buscando...')
      try {
        const res = await fetch(`/api/cedula-lookup?id=${encodeURIComponent(id)}`)
        const data = await res.json()

        if (!data.valid) {
          setLookupState('invalid')
          setLookupMsg(data.error ?? 'Cédula inválida')
          return
        }

        if (data.found && data.patient) {
          const p = data.patient
          setExistingPatientId(p.id)
          setForm(prev => ({
            ...prev,
            name: p.name ?? prev.name,
            email: p.email ?? prev.email,
            phone: p.phone ?? prev.phone,
            birthDate: p.birthDate ? p.birthDate.slice(0, 10) : prev.birthDate,
            bloodType: p.bloodType ?? prev.bloodType,
            allergies: p.allergies?.length ? p.allergies : prev.allergies,
            notes: p.notes ?? prev.notes,
          }))
          setLookupState('found')
          setLookupMsg(`Paciente encontrado en el sistema — datos precargados`)
        } else {
          setExistingPatientId(null)
          setLookupState('valid')
          setLookupMsg(`Cédula válida · Provincia: ${data.provincia ?? ''}`)
        }
      } catch {
        setLookupState('valid')
        setLookupMsg('Cédula válida')
      }
    }, 400)

    return () => { if (lookupTimer.current) clearTimeout(lookupTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.documentId, form.documentType])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    // Reset lookup when documentId cleared
    if (name === 'documentId' && value === '') {
      setLookupState('idle')
      setLookupMsg('')
      setExistingPatientId(null)
    }
  }

  function addAllergy() {
    const val = allergyInput.trim()
    if (val && !form.allergies.includes(val)) {
      setForm(prev => ({ ...prev, allergies: [...prev.allergies, val] }))
    }
    setAllergyInput('')
  }

  function removeAllergy(a: string) {
    setForm(prev => ({ ...prev, allergies: prev.allergies.filter(x => x !== a) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // If patient already exists, just navigate to their profile
    if (existingPatientId) {
      router.push(`/patients/${existingPatientId}`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar')
      }
      const { patient } = await res.json()
      router.push(`/patients/${patient.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar paciente')
      setSaving(false)
    }
  }

  const lookupColors: Record<LookupState, string> = {
    idle: '',
    loading: 'text-gray-400',
    found: 'text-green-600 dark:text-green-400',
    valid: 'text-blue-600 dark:text-blue-400',
    invalid: 'text-red-600 dark:text-red-400',
  }

  const lookupIcons: Record<LookupState, string> = {
    idle: '', loading: '⏳', found: '✓', valid: '✓', invalid: '✗',
  }

  const docIdBorder =
    lookupState === 'invalid' ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' :
    lookupState === 'found' ? 'border-green-400 focus:ring-green-400/30 focus:border-green-400' :
    lookupState === 'valid' ? 'border-blue-400 focus:ring-blue-400/30 focus:border-blue-400' :
    'dark:border-gray-600'

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/patients" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Pacientes
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo paciente</h1>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {lookupState === 'found' && existingPatientId && (
        <div className="mb-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl text-sm text-green-800 dark:text-green-300 flex items-start gap-3">
          <span className="text-lg mt-0.5">✓</span>
          <div>
            <p className="font-semibold">Paciente ya registrado en el sistema</p>
            <p className="mt-0.5 text-green-700 dark:text-green-400">Los datos fueron precargados. Al guardar serás redirigido a su perfil.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Documento — PRIMERO para trigger lookup */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Identificación
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tipo de documento
              </label>
              <select
                name="documentType"
                value={form.documentType}
                onChange={handleChange}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="cedula">Cédula ecuatoriana</option>
                <option value="pasaporte">Pasaporte</option>
                <option value="dni_extranjero">DNI / ID extranjero</option>
                <option value="ruc">RUC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Número de documento
              </label>
              <input
                type="text"
                name="documentId"
                value={form.documentId}
                onChange={handleChange}
                maxLength={form.documentType === 'cedula' ? 10 : 30}
                placeholder={
                  form.documentType === 'cedula' ? '0912345678' :
                  form.documentType === 'pasaporte' ? 'AB123456' :
                  form.documentType === 'dni_extranjero' ? 'Número de ID extranjero' : ''
                }
                className={`input dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors ${docIdBorder}`}
              />
              {lookupState !== 'idle' && lookupMsg && (
                <p className={`mt-1.5 text-xs flex items-center gap-1 ${lookupColors[lookupState]}`}>
                  <span>{lookupIcons[lookupState]}</span>
                  <span>{lookupMsg}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Datos personales */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Información personal
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Juan Pérez López"
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Fecha de nacimiento
              </label>
              <input
                type="date"
                name="birthDate"
                value={form.birthDate}
                onChange={handleChange}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tipo de sangre
              </label>
              <select
                name="bloodType"
                value={form.bloodType}
                onChange={handleChange}
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {BLOOD_TYPES.map(bt => (
                  <option key={bt} value={bt}>{BLOOD_LABELS[bt]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Contacto
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Teléfono</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+593 999 000 000"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="paciente@email.com"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Clínico */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Información clínica
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Alergias</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={allergyInput}
                onChange={e => setAllergyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAllergy() } }}
                placeholder="Ej: Penicilina, Ibuprofeno..."
                className="input flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
              <button type="button" onClick={addAllergy}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors">
                Añadir
              </button>
            </div>
            {form.allergies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.allergies.map(a => (
                  <span key={a}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                    {a}
                    <button type="button" onClick={() => removeAllergy(a)} className="hover:text-orange-900">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Notas / Antecedentes
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Antecedentes relevantes, motivo de consulta inicial..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || lookupState === 'loading' || (form.documentType === 'cedula' && lookupState === 'invalid')}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {saving ? 'Guardando...' :
             existingPatientId ? 'Ver paciente existente →' :
             'Guardar paciente'}
          </button>
          <Link href="/patients" className="btn-outline">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
