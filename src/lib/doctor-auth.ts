/**
 * Resolves the active Doctor for a Supabase user.
 * Supports both direct doctor accounts (OWNER) and DoctorMember assistants (ASSISTANT).
 */
import { prisma } from '@/lib/prisma'

export type DoctorWithRole = {
  id: string
  name: string
  specialty: string
  plan: string
  trialEndsAt: Date | null
  role: 'OWNER' | 'ASSISTANT'
}

export async function getDoctorFromUser(user: {
  id: string
  email?: string | null
}): Promise<DoctorWithRole | null> {
  // 1. Direct doctor account
  const direct = await prisma.doctor.findFirst({
    where: { OR: [{ authId: user.id }, { email: user.email! }] },
    select: { id: true, name: true, specialty: true, plan: true, trialEndsAt: true },
  })
  if (direct) return { ...direct, role: 'OWNER' }

  // 2. DoctorMember (assistant)
  const member = await prisma.doctorMember.findFirst({
    where: { authId: user.id, active: true },
    include: {
      doctor: {
        select: { id: true, name: true, specialty: true, plan: true, trialEndsAt: true },
      },
    },
  })
  if (member) return { ...member.doctor, role: 'ASSISTANT' }

  return null
}
