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
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export type DoctorWithRole = {
  id: string
  name: string
  specialty: string
  plan: string
  trialEndsAt: Date | null
  titlePrefix: string | null
  avatarUrl: string | null
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

// titlePrefix y avatarUrl viajan en esta misma consulta: el layout los necesita para
// pintar la barra lateral y antes los pedía en una segunda query a la MISMA fila.
const DOCTOR_SELECT = {
  id: true,
  name: true,
  specialty: true,
  plan: true,
  trialEndsAt: true,
  titlePrefix: true,
  avatarUrl: true,
} as const

/**
 * Returns all active DoctorMember entries for a given Supabase auth UID.
 * Used to populate the /select-doctor page and the sidebar switcher.
 */
export const getAssistantDoctors = cache(async (authId: string): Promise<AssistantDoctor[]> => {
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
})

/**
 * Resolves the active Doctor context for an authenticated Supabase user.
 *
 * Envuelto en `cache()` de React: layout raíz, layout anidado, página y route handler
 * lo llaman por separado dentro del mismo request y antes cada uno pagaba su propia
 * consulta. Con esto, todas comparten el resultado de la primera.
 *
 * @param user           - Supabase user object (id + email)
 * @param activeDoctorId - Value of the "sara-active-doctor-id" cookie (may be undefined)
 * @returns DoctorWithRole or null
 *   - null for OWNER  → user is not a doctor at all
 *   - null for ASSISTANT with multiple doctors → no selection made, redirect to /select-doctor
 */
const resolveDoctor = cache(async (
  authId: string,
  email: string | null,
  activeDoctorId: string | null,
): Promise<DoctorWithRole | null> => {
  // La cláusula por email solo se añade si hay email. Antes se pasaba `user.email!`
  // sin comprobar: con email undefined, Prisma descarta la condición y ese elemento del
  // OR pasa a ser `{}`, que hace match con CUALQUIER médico y devolvía uno arbitrario.
  const direct = await prisma.doctor.findFirst({
    where: {
      OR: [
        { authId },
        ...(email ? [{ email }] : []),
      ],
    },
    select: DOCTOR_SELECT,
  })
  if (direct) return { ...direct, role: 'OWNER' }

  // 2. DoctorMember (ASSISTANT) — fetch all active memberships
  const members = await prisma.doctorMember.findMany({
    where: { authId, active: true },
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
})

// `cache()` memoiza por identidad de argumento, así que la clave tienen que ser
// primitivos: cada call site construye su propio objeto `user` y con un objeto nunca
// habría acierto de caché.
export function getDoctorFromUser(
  user: { id: string; email?: string | null },
  activeDoctorId?: string | null,
): Promise<DoctorWithRole | null> {
  return resolveDoctor(user.id, user.email ?? null, activeDoctorId ?? null)
}

/**
 * Resuelve el médico activo para un layout del panel.
 *
 * Usa `getSession()` en vez de `getUser()`: `getUser()` hace un round-trip de red a
 * Supabase (200-800ms) en CADA navegación, y estos layouts solo deciden qué renderizar.
 * La sesión ya la validan el middleware y el layout raíz, y toda ruta API que toca datos
 * sigue usando `getUser()`, que es donde la validación en servidor importa de verdad.
 *
 * Redirige a /login si no hay sesión o el usuario no resuelve a ningún médico.
 */
export async function requireDoctorLayout(): Promise<DoctorWithRole> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) redirect('/login')

  const cookieStore = await cookies()
  const activeDoctorId = cookieStore.get('sara-active-doctor-id')?.value ?? null

  // Deduplicado por cache(): el layout raíz ya resolvió este mismo médico en esta request.
  const doctor = await getDoctorFromUser(session.user, activeDoctorId)
  if (!doctor) redirect('/login')

  return doctor
}
