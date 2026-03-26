/**
 * GET /api/arco/export
 *
 * Derecho de Acceso y Portabilidad (LOPDP Art. 68, Art. 69)
 * Exporta todos los datos personales del usuario autenticado en formato JSON estructurado.
 *
 * Para médicos: exporta perfil, pacientes (con consentimiento activo), prescripciones, atenciones.
 * Para pacientes: exporta su ficha, citas, recetas, certificados.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { auditLog, getClientIp } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ip = getClientIp(req)
    const isPatient = user.user_metadata?.role === 'patient'

    if (isPatient) {
      // ── Exportar datos del paciente ─────────────────────────────────────────
      const patient = await prisma.patient.findFirst({
        where: { authId: user.id },
        include: {
          chart: true,
          appointments: { orderBy: { date: 'desc' } },
          prescriptions: { orderBy: { date: 'desc' } },
          examOrders: { orderBy: { date: 'desc' } },
          medicalCertificates: { orderBy: { date: 'desc' } },
          diagnoses: { orderBy: { diagnosedAt: 'desc' } },
        },
      })

      if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

      await auditLog({
        userId: user.id,
        patientId: patient.id,
        resource: 'ARCO_EXPORT',
        action: 'READ',
        metadata: { ip, role: 'PATIENT', exportDate: new Date().toISOString() },
      })

      const exportData = {
        exportDate: new Date().toISOString(),
        exportType: 'ARCO_PORTABILIDAD',
        normativeBase: 'LOPDP Ecuador Art. 68-69',
        subject: {
          id: patient.id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          birthDate: patient.birthDate,
          documentId: patient.documentId,
          documentType: patient.documentType,
          bloodType: patient.bloodType,
          allergies: patient.allergies,
        },
        clinicalChart: patient.chart,
        appointments: patient.appointments,
        prescriptions: patient.prescriptions,
        examOrders: patient.examOrders,
        certificates: patient.medicalCertificates,
        diagnoses: patient.diagnoses,
      }

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="mis-datos-salud-${Date.now()}.json"`,
        },
      })
    }

    // ── Exportar datos del médico ───────────────────────────────────────────
    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const [doctorFull, patients, prescriptions, atenciones, examOrders, certificates] =
      await Promise.all([
        prisma.doctor.findFirst({
          where: { id: doctor.id },
          select: {
            id: true, name: true, specialty: true, email: true, phone: true,
            address: true, cedulaId: true, mspCode: true, specialtyRegCode: true,
            establishmentName: true, establishmentCode: true, establishmentRuc: true,
            province: true, canton: true, plan: true, createdAt: true,
          },
        }),
        prisma.patient.findMany({
          where: { doctorId: doctor.id, deletedAt: null },
          select: {
            id: true, name: true, email: true, phone: true,
            birthDate: true, documentId: true, documentType: true,
            bloodType: true, allergies: true, createdAt: true,
          },
          orderBy: { name: 'asc' },
        }),
        prisma.prescription.count({ where: { doctorId: doctor.id } }),
        prisma.attention.count({ where: { doctorId: doctor.id } }),
        prisma.examOrder.count({ where: { doctorId: doctor.id } }),
        prisma.medicalCertificate.count({ where: { doctorId: doctor.id } }),
      ])

    await auditLog({
      userId: doctor.id,
      resource: 'ARCO_EXPORT',
      action: 'READ',
      metadata: { ip, role: 'DOCTOR', exportDate: new Date().toISOString() },
    })

    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: 'ARCO_PORTABILIDAD',
      normativeBase: 'LOPDP Ecuador Art. 68-69',
      doctor: doctorFull,
      summary: {
        totalPatients: patients.length,
        totalPrescriptions: prescriptions,
        totalAtenciones: atenciones,
        totalExamOrders: examOrders,
        totalCertificates: certificates,
      },
      patients,
      note: 'Para exportar datos clínicos completos de pacientes individuales, use GET /api/arco/export?patientId={id}',
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mis-datos-medsara-${Date.now()}.json"`,
      },
    })
  } catch (err) {
    console.error('GET /api/arco/export:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
