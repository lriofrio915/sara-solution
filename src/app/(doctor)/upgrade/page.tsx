import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePlan, getTrialDaysLeft, HOTMART } from '@/lib/plan'

export const metadata: Metadata = { title: 'Actualizar Plan — Sara Medical' }
export const dynamic = 'force-dynamic'

const monthlyFeatures = [
  { icon: '👥', text: 'Pacientes ilimitados' },
  { icon: '🤖', text: 'Agente Sara IA en WhatsApp Business' },
  { icon: '📅', text: 'Agenda, fichas, recetas digitales y CIE-10' },
  { icon: '⚡', text: 'Atención y agendamiento automático 24/7' },
  { icon: '📢', text: 'Marketing Suite con IA para redes sociales' },
  { icon: '🌐', text: 'Web Médica Profesional incluida' },
  { icon: '💬', text: 'Soporte Prioritario' },
]

const annualExtras = [
  { icon: '💰', text: 'Equivale a $16/mes — ahorras $93 al año' },
  { icon: '🎁', text: 'Onboarding personalizado incluido ($150 de valor)' },
  { icon: '⭐', text: 'Soporte VIP prioritario todo el año' },
  { icon: '🚀', text: 'Acceso anticipado a nuevas funcionalidades' },
]

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { plan: true, trialEndsAt: true, name: true },
  })
  if (!doctor) redirect('/login')

  const plan = getEffectivePlan(doctor)
  const daysLeft = getTrialDaysLeft(doctor.trialEndsAt)

  if (plan === 'PRO_MENSUAL' || plan === 'PRO_ANUAL' || plan === 'ENTERPRISE') redirect('/dashboard')

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">

      {/* Header */}
      <div className="text-center mb-10">
        {plan === 'TRIAL' && daysLeft > 0 ? (
          <>
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              🎁 Trial activo — {daysLeft} día{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">
              ¡Aprovecha tu prueba gratuita!
            </h1>
            <p className="text-gray-500 dark:text-slate-300 max-w-lg mx-auto">
              Estás usando Sara Medical con acceso completo. Suscríbete antes de que expire tu trial para no perder el acceso.
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              ⚠️ Tu prueba gratuita terminó
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">
              Reactiva Sara Medical
            </h1>
            <p className="text-gray-500 dark:text-slate-300 max-w-lg mx-auto">
              Tu trial de 21 días ha concluido. Suscríbete al Plan Pro para recuperar acceso completo a todas las funcionalidades.
            </p>
          </>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">

        {/* Plan Pro Mensual */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-8 flex flex-col">
          <div className="mb-6">
            <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-2">Más popular</span>
            <div className="mb-2">
              <span className="inline-block bg-green-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">🎉 70% OFF — Precio de Lanzamiento</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Pro Mensual</h2>
            <div className="flex items-end gap-1.5 mb-1">
              <span className="text-xl font-medium text-gray-400 line-through">$79</span>
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$24</span>
              <span className="text-gray-400 text-sm mb-1">/mes</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Sin compromisos. Cancela cuando quieras.</p>
          </div>
          <ul className="space-y-2.5 mb-8 flex-1">
            {monthlyFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <span className="flex-shrink-0 mt-0.5">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>
          <a
            href={HOTMART.monthly}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center py-3.5 px-6 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-colors"
          >
            Elegir Plan Mensual →
          </a>
        </div>

        {/* Plan Pro Anual */}
        <div
          className="relative rounded-2xl p-8 flex flex-col text-white shadow-2xl shadow-primary/30 ring-2 ring-white/20"
          style={{ background: 'linear-gradient(160deg, #1E40AF 0%, #0D9488 100%)' }}
        >
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            ⭐ Mejor oferta — Ahorras $93 al año
          </div>
          <div className="mb-6">
            <div className="mb-2">
              <span className="inline-block bg-green-400 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">🎉 70% OFF — Precio de Lanzamiento</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Pro Anual</h2>
            <div className="flex items-end gap-1.5 mb-1">
              <span className="text-xl font-medium text-blue-300 line-through">$649</span>
              <span className="text-4xl font-extrabold">$195</span>
              <span className="text-blue-200 text-sm mb-1">/año</span>
            </div>
            <p className="text-blue-200 text-sm">Equivale a $16/mes</p>
          </div>
          <ul className="space-y-2.5 mb-8 flex-1">
            <li className="flex items-start gap-2.5 text-sm text-blue-100">
              <span className="flex-shrink-0 mt-0.5">✔</span>
              Todo lo del Plan Pro Mensual incluido
            </li>
            {annualExtras.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-blue-100">
                <span className="flex-shrink-0 mt-0.5">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>
          <a
            href={HOTMART.annual}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center py-3.5 px-6 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition-colors"
          >
            Elegir Plan Anual →
          </a>
        </div>
      </div>

      {/* FAQ rápido */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-white">Preguntas frecuentes</h3>
        {[
          { q: '¿Qué pasa con mis datos si no me suscribo?', a: 'Tus datos están guardados de forma segura. Si te suscribes después, recuperas acceso inmediato a toda tu información.' },
          { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. Para el plan mensual, cancelas desde Hotmart y no se te cobra el siguiente mes. Para el plan anual, el acceso continúa hasta que termine el período pagado.' },
          { q: '¿Cómo activo mi plan después de pagar?', a: 'Tu cuenta se activa automáticamente al completar el pago en Hotmart. En menos de 1 minuto tendrás acceso Pro completo.' },
        ].map((item, i) => (
          <div key={i}>
            <p className="font-semibold text-sm text-gray-800 dark:text-white">{item.q}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{item.a}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-6">
        ¿Tienes preguntas? Escríbenos a{' '}
        <a href="mailto:soporte@consultorio.site" className="text-primary hover:underline">soporte@consultorio.site</a>
      </p>
    </div>
  )
}
