/**
 * POST /api/arco/delete
 *
 * Derecho de Cancelación/Supresión (LOPDP Art. 70)
 * Elimina o anonimiza los datos del usuario autenticado, respetando:
 * - AM 0009-2017 Art. 3: Historia clínica electrónica se conserva 15 años
 * - Obligaciones legales de facturación (SRI: 7 años)
 * - Otras obligaciones legales de retención
 *
 * Proceso:
 * 1. Para datos médicos con retainUntil > now(): anonimización (no eliminación)
 * 2. Para datos sin obligación de retención: eliminación completa
 * 3. Genera constancia del proceso con timestamp
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { auditLog, getClientIp } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { confirmation, reason } = body

    // Requiere confirmación explícita para proceder
    if (confirmation !== 'ELIMINAR MIS DATOS') {
      return NextResponse.json({
        error: 'Para confirmar, envía { "confirmation": "ELIMINAR MIS DATOS" }',
      }, { status: 400 })
    }

    const ip = getClientIp(req)
    const isPatient = user.user_metadata?.role === 'patient'
    const deletionDate = new Date()
    const retainUntil = new Date(deletionDate)
    retainUntil.setFullYear(retainUntil.getFullYear() + 15) // 15 años AM 0009-2017

    if (isPatient) {
      // ── Soft delete del paciente ────────────────────────────────────────────
      const patient = await prisma.patient.findFirst({ where: { authId: user.id } })
      if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

      // Soft delete: marcar como eliminado pero retener datos médicos 15 años
      await prisma.patient.update({
        where: { id: patient.id },
        data: {
          deletedAt: deletionDate,
          retainUntil,
          // Anonimizar datos de contacto no médicos
          email: null,
          phone: null,
          avatarUrl: null,
        },
      })

      // Revocar todos los consentimientos
      await prisma.consentRecord.updateMany({
        where: { patientId: patient.id, revokedAt: null },
        data: { revokedAt: deletionDate, revokedReason: 'Solicitud ARCO de cancelación por el titular' },
      })

      await auditLog({
        userId: user.id,
        patientId: patient.id,
        resource: 'ARCO_DELETE',
        action: 'DELETE',
        metadata: {
          ip,
          reason: reason ?? 'Solicitud de eliminación por el titular',
          retainUntil: retainUntil.toISOString(),
          note: 'Datos médicos retenidos por obligación legal AM 0009-2017 (15 años)',
        },
      })

      // Eliminar cuenta de Supabase Auth
      // (el administrador debe ejecutar esto manualmente o via admin SDK)

      return NextResponse.json({
        ok: true,
        message: 'Tus datos de contacto han sido eliminados. Los datos médicos se conservarán hasta ' +
          retainUntil.toLocaleDateString('es-EC') +
          ' conforme al Acuerdo Ministerial 0009-2017 (Art. 3) que exige retención de historia clínica por 15 años.',
        retainUntil: retainUntil.toISOString(),
        deletedAt: deletionDate.toISOString(),
        confirmationCode: Buffer.from(`${patient.id}-${deletionDate.getTime()}`).toString('base64').slice(0, 16).toUpperCase(),
      })
    }

    // ── Eliminación de cuenta de médico ─────────────────────────────────────
    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    // Soft delete pacientes activos — conservar datos médicos 15 años
    await prisma.patient.updateMany({
      where: { doctorId: doctor.id, deletedAt: null },
      data: {
        deletedAt: deletionDate,
        retainUntil,
        email: null,
        phone: true ? null : undefined,  // anonimizar contacto
        avatarUrl: null,
      },
    })

    // Revocar todos los consentimientos
    await prisma.consentRecord.updateMany({
      where: { doctorId: doctor.id, revokedAt: null },
      data: { revokedAt: deletionDate, revokedReason: 'Cuenta del médico eliminada por solicitud ARCO' },
    })

    // Eliminar datos no médicos del médico
    await prisma.saraConversation.deleteMany({ where: { doctorId: doctor.id } })
    await prisma.socialPost.deleteMany({ where: { doctorId: doctor.id } })
    await prisma.reminder.deleteMany({ where: { doctorId: doctor.id } })
    await prisma.brandProfile.deleteMany({ where: { doctorId: doctor.id } })
    await prisma.brandImage.deleteMany({ where: { doctorId: doctor.id } })

    await auditLog({
      userId: doctor.id,
      resource: 'ARCO_DELETE',
      action: 'DELETE',
      metadata: {
        ip,
        reason: reason ?? 'Solicitud de eliminación por el titular (médico)',
        retainUntil: retainUntil.toISOString(),
        note: 'Datos médicos de pacientes retenidos por obligación legal AM 0009-2017 (15 años)',
      },
    })

    return NextResponse.json({
      ok: true,
      message: 'Tu cuenta ha sido marcada para eliminación. Los datos médicos de tus pacientes se conservarán hasta ' +
        retainUntil.toLocaleDateString('es-EC') +
        ' conforme al Acuerdo Ministerial 0009-2017.',
      retainUntil: retainUntil.toISOString(),
      deletedAt: deletionDate.toISOString(),
      confirmationCode: Buffer.from(`${doctor.id}-${deletionDate.getTime()}`).toString('base64').slice(0, 16).toUpperCase(),
      nextSteps: [
        'Recibirás un email de confirmación en 5 días hábiles.',
        'Para preguntas sobre datos en retención: dpo@consultorio.site',
      ],
    })
  } catch (err) {
    console.error('POST /api/arco/delete:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
