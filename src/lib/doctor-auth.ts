/**
 * Resolves the active Doctor for a Supabase user.
 * Supports both direct doctor accounts (OWNER) and DoctorMember assistants (ASSISTANT).
 *
 * Multi-doctor assistants:
 *   - An assistant can be linked to N doctors via DoctorMember rows.
 *   - The caller must pass `activeDoctorId` (read from cookie "sara-active-doctor-id").
 *   - If activeDoctorId is missing/invalid and the assistant has >1 doctor, returns null
 *     so the caller can redirect to /select-doctor.
 *   - If the assistant has exactly 1 doctor, that doctor is returned regardless of cookie.
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

export type AssistantDoctor = {
  memberId: string
  doctorId: string
  doctorName: string
  specialty: string
  avatarUrl: string | null
  establishmentName: string | null
  canSign: boolean
}

const DOCTOR_SELECT = {
  id: true,
  name: true,
  specialty: true,
  plan: true,
  trialEndsAt: true,
} as const

/**
 * Returns all active DoctorMember entries for a given Supabase auth UID.
 * Used to populate the /select-doctor page and the sidebar switcher.
 */
export async function getAssistantDoctors(authId: string): Promise<AssistantDoctor[]> {
  const members = await prisma.doctorMember.findMany({
    where: { authId, active: true },
    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          specialty: true,
          avatarUrl: true,
          establishmentName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return members.map(m => ({
    memberId: m.id,
    doctorId: m.doctorId,
    doctorName: m.doctor.name,
    specialty: m.doctor.specialty,
    avatarUrl: m.doctor.avatarUrl,
    establishmentName: m.doctor.establishmentName,
    canSign: m.canSign,
  }))
}

/**
 * Resolves the active Doctor context for an authenticated Supabase user.
 *
 * @param user           - Supabase user object (id + email)
 * @param activeDoctorId - Value of the "sara-active-doctor-id" cookie (may be undefined)
 * @returns DoctorWithRole or null
 *   - null for OWNER  → user is not a doctor at all
 *   - null for ASSISTANT with multiple doctors → no selection made, redirect to /select-doctor
 */
export async function getDoctorFromUser(
  user: { id: string; email?: string | null },
  activeDoctorId?: string | null,
): Promise<DoctorWithRole | null> {
  // 1. Direct doctor account (OWNER)
  const direct = await prisma.doctor.findFirst({
    where: { OR: [{ authId: user.id }, { email: user.email! }] },
    select: DOCTOR_SELECT,
  })
  if (direct) return { ...direct, role: 'OWNER' }

  // 2. DoctorMember (ASSISTANT) — fetch all active memberships
  const members = await prisma.doctorMember.findMany({
    where: { authId: user.id, active: true },
    include: { doctor: { select: DOCTOR_SELECT } },
    orderBy: { createdAt: 'asc' },
  })

  if (members.length === 0) return null

  // 2a. Exactly one doctor → use it directly (no cookie needed)
  if (members.length === 1) {
    return { ...members[0].doctor, role: 'ASSISTANT' }
  }

  // 2b. Multiple doctors → require activeDoctorId cookie
  if (activeDoctorId) {
    const match = members.find(m => m.doctorId === activeDoctorId)
    if (match) return { ...match.doctor, role: 'ASSISTANT' }
  }

  // 2c. Multi-doctor without valid selection → caller redirects to /select-doctor
  return null
}
