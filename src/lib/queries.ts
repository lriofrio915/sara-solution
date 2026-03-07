import { cache } from 'react'
import { prisma } from '@/lib/prisma'

/**
 * Obtener doctor por authId de Supabase.
 * `cache()` de React deduplica llamadas en el mismo request tree
 * (ej: layout + page no hacen doble query a la BD).
 */
export const getDoctorByAuthId = cache(async (authId: string, email?: string) => {
  return prisma.doctor.findFirst({
    where: email
      ? { OR: [{ id: authId }, { email }] }
      : { id: authId },
    select: { id: true, name: true, specialty: true, email: true, avatarUrl: true, active: true, slug: true },
  })
})
