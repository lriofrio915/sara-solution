'use client'

import { useState } from 'react'
import {
  Gift, Copy, Check, Users, Star, Clock,
  ChevronRight, Share2, Wallet, Info,
} from 'lucide-react'

interface Referral {
  id: string
  status: string
  rewardedAt: string | null
  createdAt: string
  referredName: string
  referredSpecialty: string
  referredPlan: string
  referredCreatedAt: string
}

interface Props {
  referralCode: string
  freeMonthsBalance: number
  doctorName: string
  stats: { total: number; rewarded: number; pending: number }
  referrals: Referral[]
}

export default function ReferidosClient({ referralCode, freeMonthsBalance, doctorName, stats, referrals }: Props) {
  const [copied, setCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.saramedical.com'
  const referralLink = `${baseUrl}/register?ref=${referralCode}`

  async function handleCopy() {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    const text = `Únete a Sara Medical y lleva tu consultorio al siguiente nivel con IA. Regístrate con mi código y ambos ganamos 1 mes gratis:`
    if (navigator.share) {
      await navigator.share({ title: 'Sara Medical — Invitación', text, url: referralLink })
    } else {
      handleCopy()
    }
  }

  const planBadge: Record<string, string> = {
    FREE:       'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    TRIAL:      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    PRO:        'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    ENTERPRISE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500',
  }

  const statusBadge: Record<string, { label: string; cls: string }> = {
    PENDING:  { label: 'Pendiente',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    REWARDED: { label: 'Recompensado', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-lg mx-auto">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Gift size={24} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Programa de Referidos</h1>
          <p className="text-sm text-gray-500 dark:text-slate-300 mt-0.5">
            Invita a colegas y gana meses gratis de Sara Medical
          </p>
        </div>
      </div>

      {/* Link de referido */}
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 border border-primary/20 dark:border-primary/30 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Share2 size={16} className="text-primary" />
          <h2 className="font-bold text-gray-900 dark:text-white text-sm">Tu enlace de referido</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
          Comparte este link con tus colegas. Cuando se registren y contraten un plan, <strong>ambos ganan 1 mes gratis.</strong>
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 min-w-0">
            <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md flex-shrink-0">
              {referralCode}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate font-mono">
              {referralLink}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all flex-shrink-0"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <button
          onClick={handleShare}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Share2 size={16} />
          Compartir invitación
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            label: 'Total referidos',
            value: stats.total,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
          },
          {
            icon: Check,
            label: 'Suscritos',
            value: stats.rewarded,
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-900/20',
          },
          {
            icon: Clock,
            label: 'Pendientes',
            value: stats.pending,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
          },
          {
            icon: Wallet,
            label: 'Meses disponibles',
            value: freeMonthsBalance,
            color: 'text-primary',
            bg: 'bg-primary/5 dark:bg-primary/10',
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Meses acumulados banner */}
      {freeMonthsBalance > 0 && (
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-5 text-white flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Star size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg leading-tight">
              Tienes {freeMonthsBalance} mes{freeMonthsBalance !== 1 ? 'es' : ''} gratis acumulado{freeMonthsBalance !== 1 ? 's' : ''}
            </p>
            <p className="text-blue-100 text-sm mt-0.5">
              Estos meses se aplicarán como descuento en tu próxima renovación. Contáctanos para canjearlo.
            </p>
          </div>
          <ChevronRight size={20} className="text-white/60 flex-shrink-0 hidden sm:block" />
        </div>
      )}

      {/* Cómo funciona */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-5">Cómo funciona</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              icon: Share2,
              title: 'Comparte tu enlace',
              desc: 'Copia tu link personalizado y envíalo a colegas médicos por WhatsApp, email o redes sociales.',
              color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            },
            {
              step: '2',
              icon: Users,
              title: 'Tu colega se registra',
              desc: 'El médico crea su cuenta usando tu enlace. Queda vinculado como tu referido durante 21 días de trial.',
              color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
            },
            {
              step: '3',
              icon: Gift,
              title: 'Ambos ganan 1 mes',
              desc: 'Cuando tu colega contrata un plan mensual o anual, los dos reciben 1 mes gratis de Sara Medical.',
              color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
            },
          ].map(({ step, icon: Icon, title, desc, color }) => (
            <div key={step} className="flex gap-4">
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm`}>
                {step}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{title}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Beneficios acumulables */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-4">Beneficios acumulables</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              title: 'Plan Mensual',
              desc: 'Cada mes de referido acumulado descuenta un mes de tu siguiente factura mensual.',
              example: '3 referidos suscritos = 3 meses gratis',
              color: 'border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/10',
            },
            {
              title: 'Plan Anual',
              desc: 'Los meses gratis se suman al final del año. Con 12 referidos suscritos, tu próxima suscripción anual es gratis.',
              example: '12 referidos suscritos = año completo gratis',
              color: 'border-violet-200 dark:border-violet-800/50 bg-violet-50 dark:bg-violet-900/10',
            },
          ].map(({ title, desc, example, color }) => (
            <div key={title} className={`rounded-xl border p-4 ${color}`}>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">{title}</h3>
              <p className="text-xs text-gray-600 dark:text-slate-300 mb-3 leading-relaxed">{desc}</p>
              <div className="flex items-center gap-2 p-2 bg-white/70 dark:bg-gray-800/70 rounded-lg">
                <Star size={12} className="text-primary flex-shrink-0" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{example}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-4 flex items-start gap-1.5">
          <Info size={12} className="flex-shrink-0 mt-0.5" />
          <span>
            Los meses acumulados no tienen vencimiento. Para canjearlos, contáctanos en{' '}
            <a href="mailto:soporte@consultorio.site" className="text-primary hover:underline">soporte@consultorio.site</a>
            {' '}o por WhatsApp al momento de tu renovación.
          </span>
        </p>
      </div>

      {/* Tabla de referidos */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">Historial de referidos</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {stats.total === 0 ? 'Aún no tienes referidos. ¡Comparte tu enlace!' : `${stats.total} médico${stats.total !== 1 ? 's' : ''} registrado${stats.total !== 1 ? 's' : ''} con tu código`}
          </p>
        </div>

        {referrals.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-gray-300 dark:text-gray-500" />
            </div>
            <p className="font-medium text-gray-500 dark:text-slate-400 mb-1">Sin referidos todavía</p>
            <p className="text-sm text-gray-400 dark:text-slate-500">
              Comparte tu enlace con colegas para comenzar a ganar meses gratis
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-slate-300">Médico</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-slate-300 hidden sm:table-cell">Especialidad</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-slate-300">Plan</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-slate-300">Estado</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-slate-300 hidden md:table-cell">Fecha registro</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => {
                  const badge = statusBadge[r.status] ?? statusBadge.PENDING
                  const plan = r.referredPlan as string
                  return (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary/30 to-secondary/30 dark:from-primary/20 dark:to-secondary/20 rounded-full flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">
                            {r.referredName[0]}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{r.referredName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-500 dark:text-slate-400 hidden sm:table-cell">{r.referredSpecialty}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${planBadge[plan] ?? planBadge.FREE}`}>
                          {plan}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                          {r.status === 'REWARDED' && <Check size={10} />}
                          {r.status === 'PENDING' && <Clock size={10} />}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-400 dark:text-slate-500 text-xs hidden md:table-cell">
                        {new Date(r.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
