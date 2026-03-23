import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { getEffectivePlan } from '@/lib/plan'
import PlanGate from '@/components/PlanGate'

export const dynamic = 'force-dynamic'

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
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
      feature="Facturación"
      description="Gestiona los cobros, historial de pagos y reportes financieros de tu consultorio. Disponible en el Plan Pro."
    >
      {children}
    </PlanGate>
  )
}
