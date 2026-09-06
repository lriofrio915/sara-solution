import { requireDoctorLayout } from '@/lib/doctor-auth'
import { getEffectivePlan } from '@/lib/plan'
import PlanGate from '@/components/PlanGate'

export const dynamic = 'force-dynamic'

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const plan = getEffectivePlan(await requireDoctorLayout())

  return (
    <PlanGate
      plan={plan}
      feature="Gestión de Equipo"
      description="Invita a tu asistente y gestiona los permisos de tu equipo de trabajo. Disponible en el Plan Pro."
    >
      {children}
    </PlanGate>
  )
}
