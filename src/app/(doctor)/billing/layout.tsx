import { requireDoctorLayout } from '@/lib/doctor-auth'
import { getEffectivePlan } from '@/lib/plan'
import PlanGate from '@/components/PlanGate'

export const dynamic = 'force-dynamic'

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const plan = getEffectivePlan(await requireDoctorLayout())

  return (
    <PlanGate
      plan={plan}
      feature="Facturación"
      description="Gestiona los cobros, historial de pagos y reportes financieros de tu consultorio. Disponible en el Plan Pro."
    >
      {children}
    </PlanGate>
  )
}
