import Link from 'next/link'
import type { EffectivePlan } from '@/lib/plan'
import { isPro } from '@/lib/plan'

interface Props {
  plan: EffectivePlan
  feature: string
  description?: string
  children: React.ReactNode
}

export default function PlanGate({ plan, feature, description, children }: Props) {
  if (isPro(plan)) return <>{children}</>

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
      {/* Lock icon */}
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 flex items-center justify-center mb-5">
        <svg className="w-9 h-9 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-3">
        Plan Pro requerido
      </span>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{feature}</h2>

      <p className="text-gray-500 dark:text-slate-400 mb-8 max-w-sm leading-relaxed text-sm">
        {description ?? 'Esta funcionalidad está disponible en el Plan Pro. Actualiza para acceder.'}
      </p>

      <Link
        href="/upgrade"
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all hover:-translate-y-0.5 shadow-lg text-sm"
      >
        Ver planes y desbloquear
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>

      <p className="mt-4 text-xs text-gray-400 dark:text-slate-500">
        21 días gratis · Sin tarjeta de crédito
      </p>
    </div>
  )
}
