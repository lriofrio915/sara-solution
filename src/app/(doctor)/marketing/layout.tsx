import { requireDoctorLayout } from '@/lib/doctor-auth'
import { getEffectivePlan } from '@/lib/plan'
import PlanGate from '@/components/PlanGate'
import MarketingNav from './_nav'
import CreditBalance, { CreditProvider } from '@/components/marketing/CreditBalance'

export const dynamic = 'force-dynamic'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const plan = getEffectivePlan(await requireDoctorLayout())

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
