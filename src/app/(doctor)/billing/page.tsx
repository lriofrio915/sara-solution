'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Receipt, CheckCircle2, Clock, Building2, FileCheck, Send, Globe, ExternalLink } from 'lucide-react'

interface DoctorProfile {
  name: string
  email: string
  phone: string | null
  cedulaId: string | null
  establishmentName: string | null
  establishmentCode: string | null
  establishmentRuc: string | null
  address: string | null
  province: string | null
  canton: string | null
}

export default function BillingPage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => setProfile(d))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  const phases = [
    {
      icon: CheckCircle2,
      iconColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      badge: 'Actual',
      badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      title: 'Fase 1: Configuración de Datos del Emisor',
      desc: 'Registro del RUC, nombre del establecimiento, código de establecimiento MSP y firma electrónica del doctor.',
      done: true,
    },
    {
      icon: Clock,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      badge: 'Próximamente',
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      title: 'Fase 2: Generación de Facturas Electrónicas XML SRI',
      desc: 'Generación automática de comprobantes electrónicos en formato XML válido para el SRI, con firma digital incluida.',
      done: false,
    },
    {
      icon: Send,
      iconColor: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      badge: 'Próximamente',
      badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
      title: 'Fase 3: Integración Directa con el SRI',
      desc: 'Envío automático de comprobantes al SRI, recepción de autorizaciones, notificación al paciente por email y portal de facturas.',
      done: false,
    },
  ]

  const upcoming = [
    { icon: FileCheck, label: 'Generación de XML con firma digital SRI' },
    { icon: Send, label: 'Envío automático al SRI y recepción de autorización' },
    { icon: Receipt, label: 'Historial de facturas emitidas por paciente' },
    { icon: Globe, label: 'Portal de facturas para pacientes' },
    { icon: Building2, label: 'Gestión de múltiples establecimientos' },
  ]

  const profileFields = [
    { label: 'RUC del establecimiento', value: profile?.establishmentRuc ?? null, key: 'establishmentRuc' },
    { label: 'Nombre del establecimiento', value: profile?.establishmentName ?? null, key: 'establishmentName' },
    { label: 'Código del establecimiento', value: profile?.establishmentCode ?? null, key: 'establishmentCode' },
    { label: 'Cédula del doctor', value: profile?.cedulaId ?? null, key: 'cedulaId' },
    { label: 'Provincia', value: profile?.province ?? null, key: 'province' },
    { label: 'Cantón', value: profile?.canton ?? null, key: 'canton' },
    { label: 'Dirección', value: profile?.address ?? null, key: 'address' },
  ]

  const filledFields = profileFields.filter(f => f.value).length
  const completionPct = Math.round((filledFields / profileFields.length) * 100)

  return (
    <div className="p-6 space-y-6 max-w-screen-lg mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Receipt size={24} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Facturación Electrónica
              </h1>
              <span className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full">
                <Clock size={12} />
                En Desarrollo
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-300 mt-0.5">
              Primera etapa — configuración base
            </p>
          </div>
        </div>
      </div>

      {/* Phases card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-5">Plan de Implementación</h2>
        <div className="space-y-5">
          {phases.map((phase, idx) => (
            <div key={idx} className="flex gap-4">
              <div className={`w-10 h-10 ${phase.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <phase.icon size={20} className={phase.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{phase.title}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${phase.badgeColor}`}>
                    {phase.badge}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-300">{phase.desc}</p>
              </div>
              {idx < phases.length - 1 && (
                <div className="absolute" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Datos del Emisor */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Datos del Emisor</h2>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
              Configurados desde tu perfil. Estos datos se usarán en los comprobantes electrónicos.
            </p>
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            Editar en Mi Perfil
            <ExternalLink size={12} />
          </Link>
        </div>

        {/* Completion indicator */}
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500 dark:text-slate-300">Perfil de emisor completado</span>
            <span className={`font-bold ${completionPct >= 70 ? 'text-green-600' : completionPct >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
              {completionPct}%
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                completionPct >= 70 ? 'bg-green-500' : completionPct >= 40 ? 'bg-amber-500' : 'bg-red-400'
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          {completionPct < 100 && (
            <p className="text-xs text-gray-400 mt-1.5">
              Completa los datos faltantes en{' '}
              <Link href="/profile" className="text-primary font-semibold hover:underline">
                Mi Perfil
              </Link>{' '}
              para habilitar la facturación.
            </p>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1.5" />
                <div className="h-9 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profileFields.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-300 mb-1.5">
                  {field.label}
                </label>
                <div className={`w-full px-3 py-2.5 rounded-xl text-sm border ${
                  field.value
                    ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 text-red-400 dark:text-red-500 italic'
                }`}>
                  {field.value ?? 'No configurado'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Próximas Funcionalidades */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-primary" />
          <h2 className="font-bold text-gray-900 dark:text-white">Próximas Funcionalidades</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {upcoming.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-dashed border-gray-200 dark:border-gray-600"
            >
              <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <item.icon size={16} className="text-primary" />
              </div>
              <span className="text-sm text-gray-600 dark:text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-400 mt-4 text-center">
          Estas funcionalidades estarán disponibles en las próximas versiones de Sara.
        </p>
      </div>

    </div>
  )
}
