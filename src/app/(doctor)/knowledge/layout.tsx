import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { getEffectivePlan } from '@/lib/plan'
import PlanGate from '@/components/PlanGate'

export const dynamic = 'force-dynamic'

export default async function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const activeDoctorId = cookieStore.get('sara-active-doctor-id')?.value ?? null
  const doctor = await getDoctorFromUser(user, activeDoctorId)
  if (!doctor) redirect('/login')

  const plan = getEffectivePlan(doctor)

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
