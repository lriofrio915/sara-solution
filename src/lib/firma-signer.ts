/**
 * Titular (CN) del certificado FirmaEC configurado por un médico.
 * Usado por las páginas de impresión server-side para previsualizar el
 * sello de firma antes de generar el PDF firmado. Devuelve null si no hay
 * certificado configurado o no se puede leer — nunca lanza.
 */
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateP12, decryptPassword } from '@/lib/firma-ec'

export async function getConfiguredSignerSubject(doctorId: string): Promise<string | null> {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { signaturePath: true, signatureIv: true, signatureTag: true, signatureEncPass: true },
    })
    if (!doctor?.signaturePath || !doctor.signatureIv || !doctor.signatureTag || !doctor.signatureEncPass) {
      return null
    }
    const { data, error } = await createAdminClient().storage
      .from('firma-ec')
      .download(doctor.signaturePath.replace(/^firma-ec\//, ''))
    if (error || !data) return null
    const buffer = Buffer.from(await data.arrayBuffer())
    const password = decryptPassword(doctor.signatureIv, doctor.signatureTag, doctor.signatureEncPass)
    const validation = validateP12(buffer, password)
    return validation.valid && validation.subject ? validation.subject : null
  } catch {
    return null
  }
}
