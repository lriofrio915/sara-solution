import { requireDoctorLayout } from '@/lib/doctor-auth'
import { getEffectivePlan } from '@/lib/plan'
import PlanGate from '@/components/PlanGate'

export const dynamic = 'force-dynamic'

export default async function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  const plan = getEffectivePlan(await requireDoctorLayout())

  return (
    <PlanGate
      plan={plan}
      feature="Base de Conocimiento"
      description="Sube tus guías clínicas, protocolos y documentos médicos para que Sara los estudie y te responda como experta. Disponible en el Plan Pro."
    >
      {children}
    </PlanGate>
  )
}
