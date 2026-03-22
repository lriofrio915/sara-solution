'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, UserPlus, Clock, CheckCircle2, XCircle,
  AlertCircle, Search, Phone, Calendar, ChevronRight,
} from 'lucide-react'
import PhoneInput from '@/components/PhoneInput'
import { validateCedula } from '@/lib/cedula-ec'

// ─── Types ───────────────────────────────────────────────────

interface Appointment {
  id: string
  date: string
  duration: number
  status: string
  reason: string | null
  type: string
  patient: { id: string; name: string; phone: string | null }
}

type LookupState = 'idle' | 'loading' | 'found' | 'valid' | 'invalid'

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CONFIRMED:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  COMPLETED:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  CANCELLED:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  NO_SHOW:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

const BLOOD_TYPES = ['UNKNOWN', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const BLOOD_LABELS: Record<string, string> = {
  UNKNOWN: 'Desconocido', A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

// ─── Sala de espera ───────────────────────────────────────────

function WaitingRoom() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/appointments?filter=today')
      const data = await res.json()
      setAppointments(data.appointments ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    try {
      await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await load()
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = appointments.filter(a =>
    !search || a.patient.name.toLowerCase().includes(search.toLowerCase())
  )

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar paciente..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <Calendar size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">
            {search ? 'No se encontró ese paciente.' : 'No hay citas programadas para hoy.'}
          </p>
          <Link href="/appointments/new" className="mt-3 inline-block text-xs text-primary hover:underline">
            Agendar nueva cita →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(appt => (
            <div
              key={appt.id}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                {/* Time */}
                <div className="flex-shrink-0 text-center bg-primary/10 dark:bg-primary/20 rounded-xl px-3 py-2 min-w-[56px]">
                  <p className="text-xs font-bold text-primary">{formatTime(appt.date)}</p>
                  <p className="text-[10px] text-primary/70">{appt.duration}min</p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/patients/${appt.patient.id}`} className="font-semibold text-sm text-gray-900 dark:text-white hover:text-primary transition-colors truncate">
                      {appt.patient.name}
                    </Link>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[appt.status]}`}>
                      {STATUS_LABELS[appt.status] ?? appt.status}
                    </span>
                  </div>
                  {appt.reason && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 truncate">{appt.reason}</p>
                  )}
                  {appt.patient.phone && (
                    <a href={`tel:${appt.patient.phone}`} className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-primary transition-colors mt-0.5">
                      <Phone size={10} /> {appt.patient.phone}
                    </a>
                  )}
                </div>

                {/* View */}
                <Link href={`/patients/${appt.patient.id}`} className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-primary hover:bg-primary/5 transition-colors">
                  <ChevronRight size={16} />
                </Link>
              </div>

              {/* Quick actions — only for active statuses */}
              {(appt.status === 'SCHEDULED' || appt.status === 'CONFIRMED') && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {appt.status === 'SCHEDULED' && (
                    <button
                      onClick={() => updateStatus(appt.id, 'CONFIRMED')}
                      disabled={updatingId === appt.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-60"
                    >
                      <CheckCircle2 size={13} />
                      Confirmar llegada
                    </button>
                  )}
                  {appt.status === 'CONFIRMED' && (
                    <button
                      onClick={() => updateStatus(appt.id, 'COMPLETED')}
                      disabled={updatingId === appt.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-60"
                    >
                      <CheckCircle2 size={13} />
                      Marcar atendido
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus(appt.id, 'NO_SHOW')}
                    disabled={updatingId === appt.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-60"
                  >
                    <XCircle size={13} />
                    No asistió
                  </button>
                  <button
                    onClick={() => updateStatus(appt.id, 'CANCELLED')}
                    disabled={updatingId === appt.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-60"
                  >
                    <XCircle size={13} />
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary bar */}
      {appointments.length > 0 && (
        <div className="flex gap-3 text-xs text-gray-400 dark:text-slate-500 justify-center pt-1">
          <span>{appointments.filter(a => a.status === 'SCHEDULED').length} programadas</span>
          <span>·</span>
          <span>{appointments.filter(a => a.status === 'CONFIRMED').length} confirmadas</span>
          <span>·</span>
          <span>{appointments.filter(a => a.status === 'COMPLETED').length} atendidas</span>
        </div>
      )}
    </div>
  )
}

// ─── Registro de paciente ─────────────────────────────────────

function PatientRegistration() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allergyInput, setAllergyInput] = useState('')
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

  useEffect(() => {
    const id = form.documentId.trim()
    if (lookupTimer.current) clearTimeout(lookupTimer.current)

    if (form.documentType !== 'cedula') {
      setLookupState('idle'); setLookupMsg(''); return
    }
    if (id.length < 10) {
      setLookupState('idle'); setLookupMsg(''); return
    }

    const validation = validateCedula(id)
    if (!validation.valid) {
      setLookupState('invalid'); setLookupMsg(validation.error); return
    }

    lookupTimer.current = setTimeout(async () => {
      setLookupState('loading'); setLookupMsg('Buscando...')
      try {
        const res = await fetch(`/api/cedula-lookup?id=${encodeURIComponent(id)}`)
        const data = await res.json()
        if (!data.valid) {
          setLookupState('invalid'); setLookupMsg(data.error ?? 'Cédula inválida'); return
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
          setLookupState('found'); setLookupMsg('Paciente encontrado — datos precargados')
        } else {
          setExistingPatientId(null)
          setLookupState('valid'); setLookupMsg(`Cédula válida · Provincia: ${data.provincia ?? ''}`)
        }
      } catch {
        setLookupState('valid'); setLookupMsg('Cédula válida')
      }
    }, 400)

    return () => { if (lookupTimer.current) clearTimeout(lookupTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.documentId, form.documentType])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === 'documentId' && value === '') {
      setLookupState('idle'); setLookupMsg(''); setExistingPatientId(null)
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
    if (existingPatientId) { router.push(`/patients/${existingPatientId}`); return }
    setSaving(true); setError(null)
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
    idle: '', loading: 'text-gray-400', found: 'text-green-600 dark:text-green-400',
    valid: 'text-blue-600 dark:text-blue-400', invalid: 'text-red-600 dark:text-red-400',
  }
  const lookupIcons: Record<LookupState, string> = {
    idle: '', loading: '⏳', found: '✓', valid: '✓', invalid: '✗',
  }
  const docIdBorder =
    lookupState === 'invalid' ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' :
    lookupState === 'found'   ? 'border-green-400 focus:ring-green-400/30 focus:border-green-400' :
    lookupState === 'valid'   ? 'border-blue-400 focus:ring-blue-400/30 focus:border-blue-400' :
    'dark:border-gray-600'

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {lookupState === 'found' && existingPatientId && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl text-sm text-green-800 dark:text-green-300 flex items-start gap-3">
          <span className="text-lg mt-0.5">✓</span>
          <div>
            <p className="font-semibold">Paciente ya registrado</p>
            <p className="mt-0.5 text-green-700 dark:text-green-400 text-xs">Al guardar serás redirigido a su perfil.</p>
          </div>
        </div>
      )}

      {/* Identificación */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Identificación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Tipo de documento</label>
            <select name="documentType" value={form.documentType} onChange={handleChange} className={inputCls}>
              <option value="cedula">Cédula ecuatoriana</option>
              <option value="pasaporte">Pasaporte</option>
              <option value="dni_extranjero">DNI / ID extranjero</option>
              <option value="ruc">RUC</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Número</label>
            <input
              type="text"
              name="documentId"
              value={form.documentId}
              onChange={handleChange}
              maxLength={form.documentType === 'cedula' ? 10 : 30}
              placeholder={form.documentType === 'cedula' ? '0912345678' : 'Número'}
              className={`${inputCls} ${docIdBorder}`}
            />
            {lookupState !== 'idle' && lookupMsg && (
              <p className={`mt-1 text-xs flex items-center gap-1 ${lookupColors[lookupState]}`}>
                <span>{lookupIcons[lookupState]}</span><span>{lookupMsg}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Datos personales</h3>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nombre completo <span className="text-red-500">*</span></label>
          <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Juan Pérez López" className={inputCls} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Fecha de nacimiento</label>
            <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Tipo de sangre</label>
            <select name="bloodType" value={form.bloodType} onChange={handleChange} className={inputCls}>
              {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{BLOOD_LABELS[bt]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Contacto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Teléfono</label>
            <PhoneInput name="phone" value={form.phone} onChange={handleChange} placeholder="+593 99 900 0000" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="paciente@email.com" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Clínico */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-400">Información clínica</h3>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Alergias conocidas</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={allergyInput}
              onChange={e => setAllergyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAllergy() } }}
              placeholder="Ej: Penicilina..."
              className={`${inputCls} flex-1`}
            />
            <button type="button" onClick={addAllergy} className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors">
              +
            </button>
          </div>
          {form.allergies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.allergies.map(a => (
                <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                  {a}
                  <button type="button" onClick={() => removeAllergy(a)} className="hover:text-orange-900 ml-0.5">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Notas / Motivo de consulta</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Antecedentes relevantes, motivo de primera consulta..."
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || lookupState === 'loading' || (form.documentType === 'cedula' && lookupState === 'invalid')}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' :
           existingPatientId ? 'Ver paciente existente →' :
           'Registrar paciente'}
        </button>
        <Link href="/patients" className="btn-outline">Ver todos los pacientes</Link>
      </div>
    </form>
  )
}

// ─── Página principal ─────────────────────────────────────────

export default function ReceptionPage() {
  const [tab, setTab] = useState<'espera' | 'registro'>('espera')

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardList size={24} className="text-primary" />
          Recepción
        </h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
          Gestiona la sala de espera y registra nuevos pacientes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
        <button
          onClick={() => setTab('espera')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'espera'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
        >
          <Clock size={16} />
          Sala de espera
        </button>
        <button
          onClick={() => setTab('registro')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'registro'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
        >
          <UserPlus size={16} />
          Registrar paciente
        </button>
      </div>

      {/* Content */}
      {tab === 'espera' ? <WaitingRoom /> : <PatientRegistration />}
    </div>
  )
}
