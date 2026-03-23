import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { getEffectivePlan, isPro, FREE_LIMITS } from '@/lib/plan'
import { prisma } from '@/lib/prisma'
import FreeLimitGate from '@/components/FreeLimitGate'

export const dynamic = 'force-dynamic'

export default async function NewPrescriptionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const activeDoctorId = cookieStore.get('sara-active-doctor-id')?.value ?? null
  const doctor = await getDoctorFromUser(user, activeDoctorId)
  if (!doctor) redirect('/login')

  const plan = getEffectivePlan(doctor)
  if (isPro(plan)) return <>{children}</>

  const count = await prisma.prescription.count({ where: { doctorId: doctor.id } })
  if (count >= FREE_LIMITS.prescriptions) {
    return <FreeLimitGate feature="Recetas" limit={FREE_LIMITS.prescriptions} current={count} />
  }

  return <>{children}</>
}
