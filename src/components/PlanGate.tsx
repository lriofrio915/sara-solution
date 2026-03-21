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
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="text-6xl mb-5">🔒</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{feature}</h2>
      <p className="text-gray-500 dark:text-slate-400 mb-8 max-w-sm">
        {description ?? 'Esta funcionalidad está disponible en el Plan Pro. Actualiza para acceder.'}
      </p>
      <Link
        href="/upgrade"
        className="px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors text-base"
      >
        Ver planes Pro →
      </Link>
      <p className="mt-4 text-xs text-gray-400 dark:text-slate-500">
        Acceso inmediato al suscribirte
      </p>
    </div>
  )
}
