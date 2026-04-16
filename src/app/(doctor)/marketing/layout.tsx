import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePlan } from '@/lib/plan'
import PlanGate from '@/components/PlanGate'
import MarketingNav from './_nav'
import CreditBalance, { CreditProvider } from '@/components/marketing/CreditBalance'

export const dynamic = 'force-dynamic'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
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
      feature="Marketing Suite con IA"
      description="Genera contenido para redes sociales, gestiona tu branding y activa el autopilot de publicaciones con IA. Disponible en el Plan Pro."
    >
      <CreditProvider>
        <div className="flex flex-col h-full">
          <div className="px-6 md:px-8 pt-4 flex items-center justify-end">
            <CreditBalance />
          </div>
          <MarketingNav />
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </CreditProvider>
    </PlanGate>
  )
}
