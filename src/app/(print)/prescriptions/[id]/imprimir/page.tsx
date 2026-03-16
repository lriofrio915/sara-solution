'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getInitials } from '@/lib/utils'
import Image from 'next/image'

interface Medication {
  name: string
  dose?: string
  frequency?: string
  duration?: string
  notes?: string
}

interface PrescriptionData {
  id: string
  date: string
  diagnosis: string | null
  medications: Medication[]
  instructions: string | null
  rxNumber?: string | null
  patient: {
    name: string
    documentId: string | null
    birthDate: string | null
    allergies?: string[]
  }
  doctor: {
    name: string
    specialty: string
    email: string
    phone: string | null
    address: string | null
    avatarUrl?: string | null
    slug?: string | null
    whatsapp?: string | null
  }
}

function numberToWords(n: number): string {
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
    'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco']
  if (n <= 25) return units[n]
  if (n < 100) {
    const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
    const t = Math.floor(n / 10)
    const u = n % 10
    return u === 0 ? tens[t] : `${tens[t]} y ${units[u]}`
  }
  return `${n}`
}

function extractAlarmSigns(instructions: string | null): { main: string; alarmSigns: string } {
  if (!instructions) return { main: '', alarmSigns: '' }
  const lower = instructions.toLowerCase()
  const markers = ['signos de alarma:', 'signos de alerta:', 'alarma:', 'señales de alarma:']
  for (const marker of markers) {
    const idx = lower.indexOf(marker)
    if (idx !== -1) {
      return {
        main: instructions.slice(0, idx).trim(),
        alarmSigns: instructions.slice(idx + marker.length).trim(),
      }
    }
  }
  return { main: instructions, alarmSigns: '' }
}

export default function PrescriptionPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PrescriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [nextAppointment, setNextAppointment] = useState('')

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/prescriptions/${id}`)
      if (res.ok) {
        const json = await res.json()
        setData({ ...json.prescription, doctor: json.doctor })
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }
  if (!data) {
    return <div className="p-8 text-center text-red-600">Receta no encontrada.</div>
  }

  const doctor = data.doctor
  const patient = data.patient
  const medications = Array.isArray(data.medications) ? data.medications : []
  const initials = getInitials(doctor.name)
  const rxNumber = data.rxNumber ?? '—'
  const allergies = patient.allergies?.filter(Boolean).join(', ') || 'Sin alergias conocidas'
  const { main: mainInstructions, alarmSigns } = extractAlarmSigns(data.instructions)
  const website = doctor.slug ? `consultorio.site/${doctor.slug}` : null

  const dateObj = new Date(data.date)
  const city = doctor.address?.split(',').slice(-1)[0]?.trim() || ''
  const dateFormatted = dateObj.toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Guayaquil',
  })

  const contactPhone = doctor.whatsapp || doctor.phone

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          @page { size: A4 landscape; margin: 6mm; }
          .print-page { box-shadow: none !important; border: none !important; }
          .print-page * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
        @media screen {
          .print-page { box-shadow: 0 4px 32px rgba(0,0,0,0.15); }
        }
      `}} />

      {/* Controls — hidden when printing */}
      <div className="no-print bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 flex-wrap">
        <a href="/prescriptions" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
          ← Volver
        </a>
        <a href={`/prescriptions/${id}/imprimir`} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          {rxNumber !== '—' && <span className="font-mono font-bold text-primary mr-2">{rxNumber}</span>}
          {patient.name}
        </a>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Próxima cita:</label>
          <input
            type="text"
            value={nextAppointment}
            onChange={(e) => setNextAppointment(e.target.value)}
            placeholder="ej. 15 de abril, 10:00"
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-44"
          />
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          🖨️ Imprimir / PDF
        </button>
      </div>

      {/* A4 Landscape container */}
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen print:bg-white py-6 px-4 print:p-0 print:min-h-0">
        <div
          className="print-page bg-white mx-auto overflow-hidden rounded-lg print:rounded-none"
          style={{ width: '285mm', minHeight: '190mm' }}
        >
          <div className="flex" style={{ minHeight: '190mm' }}>

            {/* ── LEFT HALF — FARMACIA ─────────────────────────── */}
            <div className="relative flex-1 flex flex-col border-r-2 border-dashed border-gray-300" style={{ minWidth: 0 }}>
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden" style={{ opacity: 0.07 }}>
                {doctor.avatarUrl ? (
                  <Image src={doctor.avatarUrl} alt="" width={160} height={160} className="object-contain" style={{ width: '140px', height: '140px' }} />
                ) : (
                  <span className="font-black text-gray-900" style={{ fontSize: '100px', lineHeight: 1 }}>{initials}</span>
                )}
              </div>

              {/* Header */}
              <div className="relative z-10 flex items-center gap-3 px-5 py-3" style={{ backgroundColor: '#1B3A6B' }}>
                {doctor.avatarUrl ? (
                  <Image src={doctor.avatarUrl} alt="Logo" width={44} height={44} className="rounded-full object-cover flex-shrink-0" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                ) : (
                  <div className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-bold" style={{ width: '44px', height: '44px', backgroundColor: '#2c5282', fontSize: '16px' }}>{initials}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold leading-tight" style={{ fontSize: '13px' }}>{doctor.name}</p>
                  <p className="text-blue-200 uppercase tracking-widest" style={{ fontSize: '8px', letterSpacing: '0.15em' }}>{doctor.specialty}</p>
                </div>
                <div className="flex-shrink-0 border-2 border-blue-300 rounded px-2 py-0.5 text-center" style={{ minWidth: '52px' }}>
                  <p className="text-blue-200" style={{ fontSize: '7px', letterSpacing: '0.1em' }}>RECETA</p>
                  <p className="text-white font-bold" style={{ fontSize: '11px' }}>{rxNumber}</p>
                </div>
              </div>

              {/* Body */}
              <div className="relative z-10 flex-1 px-5 py-4 space-y-3" style={{ fontSize: '10px' }}>
                {/* Date + city */}
                <p className="text-gray-600">
                  {city ? `${city}, a ` : ''}{dateFormatted}
                </p>

                {/* Patient */}
                <div className="space-y-1">
                  <p className="text-gray-800">
                    <span className="font-semibold">Nombre del Paciente: </span>{patient.name}
                  </p>
                  {patient.documentId && (
                    <p className="text-gray-800">
                      <span className="font-semibold">CI: </span>{patient.documentId}
                    </p>
                  )}
                  {data.diagnosis && (
                    <p className="text-gray-800">
                      <span className="font-semibold">CIE-10: </span>{data.diagnosis}
                    </p>
                  )}
                  <p className="text-gray-800">
                    <span className="font-semibold">Alergias: </span>{allergies}
                  </p>
                </div>

                {/* Medications */}
                <div>
                  <p className="font-bold uppercase tracking-widest mb-2 border-b border-gray-200 pb-1" style={{ fontSize: '9px', color: '#1B3A6B', letterSpacing: '0.12em' }}>Prescripción</p>
                  <div className="space-y-2">
                    {medications.map((med, i) => {
                      const qty = parseInt(med.duration ?? '') || undefined
                      const qtyStr = qty ? ` #${qty} (${numberToWords(qty)})` : ''
                      return (
                        <div key={i}>
                          <p className="font-bold" style={{ color: '#1B3A6B', fontSize: '11px' }}>
                            Rp. {med.name}{med.dose ? ` ${med.dose}` : ''}
                          </p>
                          {med.frequency && (
                            <p className="ml-3 text-gray-700">
                              {med.frequency}{qtyStr}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="relative z-10 border-t border-gray-200 px-5 py-2 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ fontSize: '8px', color: '#4a5568' }}>
                {contactPhone && (
                  <span className="flex items-center gap-1">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    {contactPhone}
                  </span>
                )}
                {doctor.email && (
                  <span className="flex items-center gap-1">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {doctor.email}
                  </span>
                )}
                {doctor.address && (
                  <span className="flex items-center gap-1">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {doctor.address}
                  </span>
                )}
              </div>
            </div>

            {/* ── RIGHT HALF — PACIENTE ────────────────────────── */}
            <div className="relative flex-1 flex flex-col" style={{ minWidth: 0 }}>
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden" style={{ opacity: 0.07 }}>
                {doctor.avatarUrl ? (
                  <Image src={doctor.avatarUrl} alt="" width={160} height={160} className="object-contain" style={{ width: '140px', height: '140px' }} />
                ) : (
                  <span className="font-black text-gray-900" style={{ fontSize: '100px', lineHeight: 1 }}>{initials}</span>
                )}
              </div>

              {/* Header compact */}
              <div className="relative z-10 flex items-center gap-3 px-5 py-3" style={{ backgroundColor: '#1B3A6B' }}>
                {doctor.avatarUrl ? (
                  <Image src={doctor.avatarUrl} alt="Logo" width={36} height={36} className="rounded-full object-cover flex-shrink-0" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                ) : (
                  <div className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-bold" style={{ width: '36px', height: '36px', backgroundColor: '#2c5282', fontSize: '14px' }}>{initials}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold leading-tight" style={{ fontSize: '11px' }}>{doctor.name}</p>
                  <p className="text-blue-200 uppercase tracking-widest" style={{ fontSize: '7px', letterSpacing: '0.15em' }}>{doctor.specialty}</p>
                  <div className="flex flex-wrap gap-x-3 mt-0.5" style={{ fontSize: '7px', color: '#bee3f8' }}>
                    {contactPhone && <span>{contactPhone}</span>}
                    {doctor.email && <span>{doctor.email}</span>}
                    {website && <span>{website}</span>}
                  </div>
                </div>
                <div className="flex-shrink-0 border-2 border-blue-300 rounded px-2 py-0.5 text-center" style={{ minWidth: '52px' }}>
                  <p className="text-blue-200" style={{ fontSize: '7px', letterSpacing: '0.1em' }}>RECETA</p>
                  <p className="text-white font-bold" style={{ fontSize: '11px' }}>{rxNumber}</p>
                </div>
              </div>

              {/* Body */}
              <div className="relative z-10 flex-1 px-5 py-4 space-y-3" style={{ fontSize: '10px' }}>
                {/* Date */}
                <p className="text-gray-600">
                  {city ? `${city}, a ` : ''}{dateFormatted}
                </p>
                <p className="text-gray-800">
                  <span className="font-semibold">Paciente: </span>{patient.name}
                </p>

                {/* Instructions */}
                <div>
                  <p className="font-bold uppercase tracking-widest mb-2 border-b border-gray-200 pb-1" style={{ fontSize: '9px', color: '#1B3A6B', letterSpacing: '0.12em' }}>Indicaciones</p>
                  {mainInstructions ? (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{mainInstructions}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {medications.map((med, i) => (
                        <p key={i} className="text-gray-700">
                          <span style={{ color: '#1B3A6B' }} className="font-semibold">{med.name}</span>
                          {med.dose ? `, ${med.dose}` : ''}
                          {med.frequency ? `: ${med.frequency}` : ''}
                          {med.duration ? ` por ${med.duration}` : ''}
                          {med.notes ? `. ${med.notes}` : '.'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Alarm signs */}
                {alarmSigns && (
                  <div>
                    <p className="font-bold mb-1" style={{ fontSize: '9px', color: '#1B3A6B' }}>Signos de alarma:</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{alarmSigns}</p>
                  </div>
                )}

                {/* Next appointment */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  <p className="font-semibold text-gray-800">Próxima Cita:</p>
                  {nextAppointment ? (
                    <p className="text-gray-700">{nextAppointment}</p>
                  ) : (
                    <p className="text-gray-400 italic">__________________________</p>
                  )}
                </div>
              </div>

              {/* Signature area */}
              <div className="relative z-10 border-t border-gray-200 px-5 py-3 flex justify-end" style={{ fontSize: '9px' }}>
                <div className="text-center">
                  <div className="border-b border-gray-400 mb-1 mx-auto" style={{ width: '100px' }} />
                  <p className="font-bold text-gray-800">{doctor.name}</p>
                  <p className="text-gray-500">{doctor.specialty}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
