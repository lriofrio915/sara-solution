'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PhoneInput from '@/components/PhoneInput'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    specialty: '',
    email: '',
    phone: '',
    whatsapp: '',
    password: '',
    confirmPassword: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)

    const supabase = createClient()

    // 1. Crear usuario en Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim() } },
    })

    if (signUpError) {
      if (signUpError.message === 'User already registered') {
        setIsAlreadyRegistered(true)
        setError('Ya existe una cuenta con este correo.')
      } else {
        setIsAlreadyRegistered(false)
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }
    setIsAlreadyRegistered(false)

    // 2. Crear registro Doctor en Prisma vía API
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: data.user?.id,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        specialty: form.specialty,
        email: form.email,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Error al crear tu perfil. Contacta soporte.')
      setLoading(false)
      return
    }

    // Full reload so the server middleware reads the Supabase session cookie
    window.location.href = '/dashboard'
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Crea tu cuenta profesional</h2>
        <p className="text-gray-500 mt-1">Únete a Sara Medical y lleva tu consulta al siguiente nivel</p>
      </div>

      {/* Patient notice */}
      <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-xl text-sm">
        <p className="text-teal-800 font-medium mb-0.5">¿Eres paciente?</p>
        <p className="text-teal-700">
          No necesitas registrarte. Busca a tu médico y agenda tu cita con Sara.{' '}
          <Link href="/buscar-medico" className="font-semibold underline hover:text-teal-900">
            Buscar mi médico →
          </Link>
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}{' '}
          {isAlreadyRegistered && (
            <Link href="/forgot-password" className="font-semibold underline hover:text-red-900">
              ¿Olvidaste tu contraseña?
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre</label>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Carlos"
              required
              autoComplete="given-name"
              className="input"
            />
          </div>
          <div>
            <label className="label">Apellido</label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Rodríguez"
              required
              autoComplete="family-name"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Especialidad</label>
          <input
            type="text"
            name="specialty"
            value={form.specialty}
            onChange={handleChange}
            placeholder="Medicina Interna"
            required
            className="input"
          />
        </div>

        <div>
          <label className="label">Correo electrónico</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="doctora@ejemplo.com"
            required
            autoComplete="email"
            className="input"
          />
        </div>

        <div>
          <label className="label">WhatsApp Personal</label>
          <PhoneInput
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="+593 99 123 4567"
            required
            autoComplete="tel"
            className="input"
          />
          <p className="text-xs text-gray-400 mt-1">Tu número personal — no se muestra públicamente</p>
        </div>

        <div>
          <label className="label">
            WhatsApp Business{' '}
            <span className="text-gray-400 font-normal text-xs">(opcional — puedes configurarlo después)</span>
          </label>
          <PhoneInput
            name="whatsapp"
            value={form.whatsapp}
            onChange={handleChange}
            placeholder="+593 98 765 4321"
            autoComplete="tel"
            className="input"
          />
          <p className="text-xs text-gray-400 mt-1">
            Número donde vivirá el agente Sara IA que atiende y agenda citas por WhatsApp. Puedes dejarlo vacío y configurarlo luego desde tu perfil.
          </p>
        </div>

        <div>
          <label className="label">Contraseña</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Mínimo 8 caracteres"
            required
            autoComplete="new-password"
            className="input"
          />
        </div>

        <div>
          <label className="label">Confirmar contraseña</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Repite tu contraseña"
            required
            autoComplete="new-password"
            className="input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta gratuita'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Al registrarte, aceptas nuestros{' '}
          <Link href="/terms" className="underline">
            Términos de servicio
          </Link>{' '}
          y{' '}
          <Link href="/privacy" className="underline">
            Política de privacidad
          </Link>
          .
        </p>
      </form>

      <p className="text-center text-gray-500 text-sm mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Inicia sesión
        </Link>
      </p>
    </>
  )
}
