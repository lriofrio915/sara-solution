'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PhoneInput from '@/components/PhoneInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiPostJson } from '@/lib/apiFetch'
import { withPosthogHeaders } from '@/lib/posthog/client'

const SPECIALTIES = [
  'Medicina General', 'Pediatría', 'Ginecología', 'Cardiología', 'Dermatología',
  'Traumatología', 'Neurología', 'Psiquiatría', 'Oftalmología', 'Odontología',
  'Medicina Familiar', 'Cirugía General', 'Endocrinología', 'Otra especialidad',
]

export default function LeadCaptureForm() {
  const searchParams = useSearchParams()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', specialty: '', city: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const utmSource = searchParams.get('utm_source') || ''
  const utmMedium = searchParams.get('utm_medium') || ''
  const utmCampaign = searchParams.get('utm_campaign') || ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      setErrorMsg('Nombre y teléfono son requeridos.')
      return
    }
    setStatus('loading')
    setErrorMsg('')

    const result = await apiPostJson('/api/leads/public', {
      ...form,
      source: 'LANDING',
      utmSource: utmSource || 'directo',
      utmMedium,
      utmCampaign,
    }, {
      headers: withPosthogHeaders(),
    })

    if (result.ok) {
      setStatus('success')
      return
    }

    setStatus('error')
    if (result.status === 422) {
      setErrorMsg('Revisa los campos del formulario.')
    } else if (result.status === 0) {
      setErrorMsg('Sin conexión. Verifica tu internet e intenta de nuevo.')
    } else {
      setErrorMsg('Error del servidor. Intenta en unos minutos.')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Gracias, {form.name.split(' ')[0]}!</h3>
        <p className="text-gray-500 dark:text-slate-300 text-sm">
          Nos pondremos en contacto contigo en las próximas 24 horas para coordinar tu demostración personalizada.
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-400 mt-3">
          También puedes escribirnos directamente a WhatsApp si prefieres una respuesta más rápida.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errorMsg && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl"
        >
          {errorMsg}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="lcf-name">
            Nombre completo <span className="text-red-500" aria-hidden="true">*</span>
          </Label>
          <Input
            id="lcf-name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Dr. / Dra. Juan Pérez"
            required
            aria-required="true"
          />
        </div>

        <div>
          <Label htmlFor="lcf-phone">
            Teléfono / WhatsApp <span className="text-red-500" aria-hidden="true">*</span>
          </Label>
          <PhoneInput
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+593 99 999 9999"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
          />
        </div>

        <div>
          <Label htmlFor="lcf-email">Email</Label>
          <Input
            id="lcf-email"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="doctor@ejemplo.com"
          />
        </div>

        <div>
          <Label htmlFor="lcf-specialty">Especialidad</Label>
          <Select
            value={form.specialty}
            onValueChange={v => setForm(f => ({ ...f, specialty: v }))}
          >
            <SelectTrigger id="lcf-specialty" aria-label="Especialidad">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="lcf-city">Ciudad</Label>
          <Input
            id="lcf-city"
            value={form.city}
            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            placeholder="Quito, Guayaquil..."
          />
        </div>
      </div>

      <Button
        type="submit"
        loading={status === 'loading'}
        size="lg"
        className="w-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5"
      >
        {status === 'loading' ? 'Enviando...' : 'Solicitar demostración gratuita'}
      </Button>

      <p className="text-xs text-center text-gray-400 dark:text-slate-500">
        Sin compromisos. Te contactamos en menos de 24 horas.
      </p>
    </form>
  )
}
