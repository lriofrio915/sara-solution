import { requireDoctorLayout } from '@/lib/doctor-auth'
import { getEffectivePlan } from '@/lib/plan'
import PlanGate from '@/components/PlanGate'

export const dynamic = 'force-dynamic'

export default async function RemindersLayout({ children }: { children: React.ReactNode }) {
  const plan = getEffectivePlan(await requireDoctorLayout())

  return (
    <PlanGate
      plan={plan}
      feature="Notificaciones y Recordatorios"
      description="Envía recordatorios automáticos por WhatsApp, cumpleaños y encuestas de satisfacción a tus pacientes. Disponible en el Plan Pro."
    >
      {children}
    </PlanGate>
  )
}
