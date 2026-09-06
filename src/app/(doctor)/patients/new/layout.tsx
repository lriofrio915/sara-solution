import { requireDoctorLayout } from '@/lib/doctor-auth'
import { getEffectivePlan, isPro, FREE_LIMITS } from '@/lib/plan'
import { prisma } from '@/lib/prisma'
import FreeLimitGate from '@/components/FreeLimitGate'

export const dynamic = 'force-dynamic'

export default async function NewPatientLayout({ children }: { children: React.ReactNode }) {
  const doctor = await requireDoctorLayout()
  const plan = getEffectivePlan(doctor)
  if (isPro(plan)) return <>{children}</>

  const count = await prisma.patient.count({ where: { doctorId: doctor.id } })
  if (count >= FREE_LIMITS.patients) {
    return <FreeLimitGate feature="Pacientes" limit={FREE_LIMITS.patients} current={count} />
  }

  return <>{children}</>
}
