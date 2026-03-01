import { cache } from 'react'
import { prisma } from '@/lib/prisma'

/**
 * Obtener doctor por authId de Supabase.
 * `cache()` de React deduplica llamadas en el mismo request tree
 * (ej: layout + page no hacen doble query a la BD).
 */
export const getDoctorByAuthId = cache(async (authId: string) => {
  return prisma.doctor.findUnique({ where: { id: authId } })
})
