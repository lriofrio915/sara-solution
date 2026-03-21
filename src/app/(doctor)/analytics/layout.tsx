import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePlan } from '@/lib/plan'
import PlanGate from '@/components/PlanGate'

export const dynamic = 'force-dynamic'

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { plan: true, trialEndsAt: true },
  })
  if (!doctor) redirect('/login')

  const plan = getEffectivePlan(doctor)

  return (
    <PlanGate
      plan={plan}
      feature="Análisis IA"
      description="Obtén insights profundos sobre tu consultorio con inteligencia artificial: tendencias, diagnósticos frecuentes y predicciones. Disponible en el Plan Pro."
    >
      {children}
    </PlanGate>
  )
}
