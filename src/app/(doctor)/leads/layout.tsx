import { requireDoctorLayout } from '@/lib/doctor-auth'
import { getEffectivePlan } from '@/lib/plan'
import PlanGate from '@/components/PlanGate'

export const dynamic = 'force-dynamic'

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const plan = getEffectivePlan(await requireDoctorLayout())

  return (
    <PlanGate
      plan={plan}
      feature="Captación de Leads"
      description="Recibe y gestiona los pacientes potenciales que lleguen desde tu página web y el chat de Sara. Disponible en el Plan Pro."
    >
      {children}
    </PlanGate>
  )
}
