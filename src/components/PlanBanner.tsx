import Link from 'next/link'
import { getTrialDaysLeft, type EffectivePlan } from '@/lib/plan'

interface Props {
  plan: EffectivePlan
  trialEndsAt: Date | null
}

export default function PlanBanner({ plan, trialEndsAt }: Props) {
  if (plan === 'PRO' || plan === 'ENTERPRISE') return null

  const daysLeft = getTrialDaysLeft(trialEndsAt)

  if (plan === 'TRIAL') {
    if (daysLeft <= 0) {
      return (
        <div className="bg-red-500 text-white px-4 py-2.5 text-sm text-center flex items-center justify-center gap-3 flex-wrap">
          <span>⚠️ Tu prueba gratuita ha terminado. Suscríbete al Plan Pro para seguir usando Sara Medical.</span>
          <Link href="/upgrade" className="font-bold underline whitespace-nowrap">Ver planes →</Link>
        </div>
      )
    }
    if (daysLeft <= 3) {
      return (
        <div className="bg-red-500 text-white px-4 py-2.5 text-sm text-center flex items-center justify-center gap-3 flex-wrap">
          <span>⚠️ Tu prueba gratuita vence en <strong>{daysLeft} día{daysLeft !== 1 ? 's' : ''}</strong>. ¡No pierdas el acceso!</span>
          <Link href="/upgrade" className="font-bold underline whitespace-nowrap">Actualizar ahora →</Link>
        </div>
      )
    }
    return (
      <div className="bg-amber-500 text-white px-4 py-2.5 text-sm text-center flex items-center justify-center gap-3 flex-wrap">
        <span>🎁 Prueba gratuita activa — te quedan <strong>{daysLeft} días</strong>.</span>
        <Link href="/upgrade" className="font-semibold underline whitespace-nowrap">Ver planes Pro →</Link>
      </div>
    )
  }

  // FREE (trial expired)
  return (
    <div className="bg-gray-800 text-white px-4 py-3 text-sm text-center flex items-center justify-center gap-3 flex-wrap">
      <span>Tu prueba gratuita terminó. Suscríbete al Plan Pro para acceder a todas las funcionalidades de Sara Medical.</span>
      <Link href="/upgrade" className="font-bold bg-primary px-4 py-1.5 rounded-lg whitespace-nowrap hover:bg-primary/90 transition-colors">
        Actualizar a Pro →
      </Link>
    </div>
  )
}
