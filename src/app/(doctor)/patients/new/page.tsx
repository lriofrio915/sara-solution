'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const BLOOD_TYPES = ['UNKNOWN', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const BLOOD_LABELS: Record<string, string> = {
  UNKNOWN: 'Desconocido', A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

export default function NewPatientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allergyInput, setAllergyInput] = useState('')
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function addAllergy() {
    const val = allergyInput.trim()
    if (val && !form.allergies.includes(val)) {
      setForm((prev) => ({ ...prev, allergies: [...prev.allergies, val] }))
    }
    setAllergyInput('')
  }

  function removeAllergy(a: string) {
    setForm((prev) => ({ ...prev, allergies: prev.allergies.filter((x) => x !== a) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos básicos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wide text-gray-400 dark:text-gray-500">
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
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>{BLOOD_LABELS[bt]}</option>
                ))}
              </select>
            </div>
          </div>

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
                <option value="cedula">Cédula</option>
                <option value="pasaporte">Pasaporte</option>
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
                placeholder="0912345678"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
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

          {/* Alergias */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Alergias</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllergy() } }}
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
                {form.allergies.map((a) => (
                  <span key={a}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                    {a}
                    <button type="button" onClick={() => removeAllergy(a)} className="hover:text-orange-900 dark:hover:text-orange-200">×</button>
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
            disabled={saving}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {saving ? 'Guardando...' : 'Guardar paciente'}
          </button>
          <Link href="/patients" className="btn-outline">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
