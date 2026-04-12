'use client'

import { useState } from 'react'
import {
  Gift, Copy, Check, Users, Star, Clock,
  ChevronRight, Share2, Wallet, Info, MessageCircle, Sparkles,
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
  rewardPreference: string
  doctorName: string
  stats: { total: number; rewarded: number; pending: number }
  referrals: Referral[]
}

export default function ReferidosClient({ referralCode, freeMonthsBalance, rewardPreference: initialPref, doctorName, stats, referrals }: Props) {
  const [copied, setCopied] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [preference, setPreference] = useState<'FREE_MONTH' | 'CASH'>(initialPref as 'FREE_MONTH' | 'CASH')
  const [savingPref, setSavingPref] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://consultorio.site'
  const referralLink = `${baseUrl}/register?ref=${referralCode}`

  async function handleCopy() {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    const text = `Hola, te comparto una herramienta que me ha ayudado mucho para gestionar mi consultorio. Se llama Sara Medical — tiene IA para atender pacientes por WhatsApp, agenda inteligente y marketing automático. Regístrate aquí: ${referralLink}`
    if (navigator.share) {
      await navigator.share({ title: 'Sara Medical — Invitación', text, url: referralLink })
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleCopyText() {
    const text = `Hola [nombre], te comparto una herramienta que me ha ayudado mucho para gestionar mi consultorio. Se llama Sara Medical — tiene IA para atender pacientes por WhatsApp, agenda inteligente y marketing automático. Regístrate aquí: ${referralLink}`
    await navigator.clipboard.writeText(text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  async function handlePreferenceChange(pref: 'FREE_MONTH' | 'CASH') {
    if (pref === preference || savingPref) return
    setSavingPref(true)
    try {
      await fetch('/api/referidos/reward-preference', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preference: pref }),
      })
      setPreference(pref)
    } finally {
      setSavingPref(false)
    }
  }

  const planPrice: Record<string, number> = {
    PRO_MENSUAL: 79,
    PRO_ANUAL: 649,
    ENTERPRISE: 0,
    FREE: 0,
    TRIAL: 0,
  }

  const cashBalance = referrals
    .filter(r => r.status === 'REWARDED')
    .reduce((sum, r) => sum + (planPrice[r.referredPlan] ?? 0) * 0.3, 0)

  const planBadge: Record<string, string> = {
    FREE:        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    TRIAL:       'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    PRO_MENSUAL: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    PRO_ANUAL:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ENTERPRISE:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500',
  }

  const planLabel: Record<string, string> = {
    FREE: 'Free', TRIAL: 'Trial', PRO_MENSUAL: 'Pro Mensual', PRO_ANUAL: 'Pro Anual', ENTERPRISE: 'Enterprise',
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
            Invita a colegas y elige tu recompensa: 1 mes gratis o 30% en efectivo
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total referidos', value: stats.total, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { icon: Check, label: 'Suscritos', value: stats.rewarded, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
          { icon: Clock, label: 'Pendientes', value: stats.pending, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
        {/* Dynamic 4th card: meses or cash */}
        <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-primary" />
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
              {preference === 'CASH' ? 'Comisión acumulada' : 'Meses acumulados'}
            </p>
          </div>
          {preference === 'CASH' ? (
            <p className="text-3xl font-bold text-primary">${cashBalance.toFixed(2)}</p>
          ) : (
            <p className="text-3xl font-bold text-primary">{freeMonthsBalance}</p>
          )}
        </div>
      </div>

      {/* Acumulado banner — meses o comisión según preferencia */}
      {preference === 'FREE_MONTH' ? (
        freeMonthsBalance > 0 && (
          <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-5 text-white flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Star size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight">
                Tienes {freeMonthsBalance} mes{freeMonthsBalance !== 1 ? 'es' : ''} gratis acumulado{freeMonthsBalance !== 1 ? 's' : ''}
              </p>
              <p className="text-blue-100 text-sm mt-0.5">
                Se aplicarán como descuento en tu próxima renovación. Contáctanos para canjearlo.
              </p>
            </div>
            <ChevronRight size={20} className="text-white/60 flex-shrink-0 hidden sm:block" />
          </div>
        )
      ) : (
        cashBalance > 0 && (
          <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-5 text-white flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Wallet size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight">
                Tienes ${cashBalance.toFixed(2)} en comisiones acumuladas
              </p>
              <p className="text-blue-100 text-sm mt-0.5">
                Escríbenos a <span className="font-semibold">soporte@consultorio.site</span> para gestionar tu pago.
              </p>
            </div>
            <ChevronRight size={20} className="text-white/60 flex-shrink-0 hidden sm:block" />
          </div>
        )
      )}

      {/* Elige tu recompensa */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-primary" />
          <h2 className="font-bold text-gray-900 dark:text-white">Elige tu recompensa</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
          Selecciona cómo quieres recibir tu recompensa cuando un colega tuyo contrate Sara Medical.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {/* FREE_MONTH */}
          <button
            onClick={() => handlePreferenceChange('FREE_MONTH')}
            disabled={savingPref}
            className={`text-left p-5 rounded-2xl border-2 transition-all ${
              preference === 'FREE_MONTH'
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-gray-200 dark:border-gray-600 hover:border-primary/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="text-3xl">🎁</span>
              {preference === 'FREE_MONTH' && (
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Seleccionado</span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">1 mes gratis</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Cuando tu referido contrata cualquier plan, recibes 1 mes de Sara Medical completamente gratis. Los meses se acumulan sin vencimiento.
            </p>
            <div className="mt-3 p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400">3 referidos = 3 meses gratis</p>
            </div>
          </button>

          {/* CASH */}
          <button
            onClick={() => handlePreferenceChange('CASH')}
            disabled={savingPref}
            className={`text-left p-5 rounded-2xl border-2 transition-all ${
              preference === 'CASH'
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-gray-200 dark:border-gray-600 hover:border-primary/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="text-3xl">💰</span>
              {preference === 'CASH' && (
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Seleccionado</span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">30% en efectivo</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Recibes el 30% del valor del plan contratado por tu referido. Pago único al momento de su suscripción.
            </p>
            <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl space-y-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Plan mensual ($79) → ~$23.70 *</p>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Plan anual ($649) → ~$194.70 *</p>
            </div>
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-4 flex items-start gap-1.5">
          <Info size={12} className="flex-shrink-0 mt-0.5 text-amber-400" />
          <span>
            * Los valores son referenciales y están sujetos a cambios. Hotmart cobra una comisión por procesamiento de pago, por lo que el monto real recibido puede ser menor al indicado.
          </span>
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 flex items-start gap-1.5">
          <Info size={12} className="flex-shrink-0 mt-0.5" />
          <span>
            Para canjear tu recompensa en efectivo, contáctanos en{' '}
            <a href="mailto:soporte@consultorio.site" className="text-primary hover:underline">soporte@consultorio.site</a>
            {' '}después de que tu referido se suscriba.
          </span>
        </p>
      </div>

      {/* Link de referido */}
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 border border-primary/20 dark:border-primary/30 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Share2 size={16} className="text-primary" />
          <h2 className="font-bold text-gray-900 dark:text-white text-sm">Tu enlace de referido</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
          Comparte este link con tus colegas. Cuando se registren y contraten un plan, <strong>ambos ganan su recompensa.</strong>
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

      {/* Kit de afiliado */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">Kit de afiliado</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">Recursos para compartir Sara Medical con tus colegas.</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          {[
            { icon: '📱', title: 'Texto sugerido para WhatsApp', desc: 'Copia y pega el mensaje listo para enviar', action: handleCopyText, actionLabel: copiedText ? '¡Copiado!' : 'Copiar texto' },
            { icon: '🎥', title: 'Video demo de Sara', desc: 'Muestra a tus colegas cómo funciona la IA', href: 'https://www.youtube.com/@saramedical', actionLabel: 'Ver video' },
            { icon: '🎨', title: 'Artes para Instagram', desc: 'Imágenes listas para compartir en tus redes', href: 'https://www.canva.com', actionLabel: 'Abrir Canva' },
            { icon: '📝', title: 'Guía de beneficios', desc: 'PDF con todo lo que ofrece Sara Medical', href: 'https://consultorio.site', actionLabel: 'Descargar' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                {'action' in item ? (
                  <button
                    onClick={item.action}
                    className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    {item.actionLabel}
                  </button>
                ) : (
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                    {item.actionLabel} →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Texto sugerido */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={14} className="text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Texto sugerido (WhatsApp / Instagram)</p>
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic">
            {`"Hola [nombre], te comparto una herramienta que me ha ayudado mucho para gestionar mi consultorio. Se llama Sara Medical — tiene IA para atender pacientes por WhatsApp, agenda inteligente y marketing automático. Regístrate aquí: `}
            <span className="font-mono not-italic text-primary">{referralLink}</span>
            {`"`}
          </p>
          <button
            onClick={handleCopyText}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            {copiedText ? <Check size={12} /> : <Copy size={12} />}
            {copiedText ? 'Copiado' : 'Copiar mensaje'}
          </button>
        </div>
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
              Comparte tu enlace con colegas para comenzar a ganar recompensas
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
                          {planLabel[plan] ?? plan}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                          {r.status === 'REWARDED' && <Check size={10} />}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 dark:text-slate-400 hidden md:table-cell">
                        {new Date(r.referredCreatedAt).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })}
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
