import { requireDoctorLayout } from '@/lib/doctor-auth'
import { getEffectivePlan } from '@/lib/plan'
import PlanGate from '@/components/PlanGate'

export const dynamic = 'force-dynamic'

export default async function AppointmentsLayout({ children }: { children: React.ReactNode }) {
  const plan = getEffectivePlan(await requireDoctorLayout())

  return (
    <PlanGate
      plan={plan}
      feature="Agenda de Citas"
      description="Gestiona citas, confirmaciones automáticas y recordatorios por WhatsApp para tus pacientes. Disponible en el Plan Pro."
    >
      {children}
    </PlanGate>
  )
}
