/**
 * POST /api/patients/[id]/consent — Registrar consentimiento informado LOPDP
 * GET  /api/patients/[id]/consent — Consultar estado de consentimiento
 *
 * Requisito: LOPDP Art. 26 — consentimiento expreso para datos de salud (datos sensibles).
 * El médico es el responsable del tratamiento y debe obtener consentimiento del paciente.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { auditConsent, getClientIp } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// Texto canónico del consentimiento — versión 1.0
const CONSENT_TEXT_V1 = `CONSENTIMIENTO INFORMADO PARA EL TRATAMIENTO DE DATOS PERSONALES DE SALUD

De conformidad con la Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador,
Registro Oficial Suplemento 459 del 26 de mayo de 2021, y sus reglamentos vigentes:

RESPONSABLE DEL TRATAMIENTO: El profesional de salud y la plataforma MedSara (consultorio.site),
operada por Nexus Automatizaciones.

DATOS TRATADOS: Datos de identificación (nombre, cédula, fecha de nacimiento), datos de contacto,
y datos de salud (diagnósticos, tratamientos, prescripciones, signos vitales, antecedentes médicos,
resultados de exámenes) conforme al Acuerdo Ministerial 00115-2021 (Historia Clínica Única).

FINALIDAD: Prestación de servicios de salud, gestión de historia clínica electrónica, emisión de
recetas y certificados médicos, seguimiento clínico del paciente.

BASE LEGAL: Artículo 26 LOPDP — consentimiento expreso del titular para tratamiento de datos
sensibles de salud. Artículo 22 LOPDP — cumplimiento de obligación legal (AM 0009-2017, AM 00115-2021).

CONSERVACIÓN: Los datos médicos se conservan por 15 años desde la última atención, conforme al
Acuerdo Ministerial 0009-2017, Art. 3.

DERECHOS ARCO: Usted tiene derecho a Acceder, Rectificar, Cancelar y Oponerse al tratamiento de
sus datos. Para ejercerlos: dpo@consultorio.site

SUBENCARGADOS: Los datos son procesados por Supabase (infraestructura AWS), bajo acuerdos de
confidencialidad y protección de datos.

El paciente declara haber sido informado y otorga su consentimiento expreso para el tratamiento
de sus datos personales de salud con las finalidades indicadas.`

// ── GET — consultar consentimiento activo ─────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      select: { id: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const consent = await prisma.consentRecord.findFirst({
      where: { patientId: params.id, doctorId: doctor.id, revokedAt: null },
      orderBy: { acceptedAt: 'desc' },
    })

    return NextResponse.json({
      hasConsent: !!consent,
      consent: consent ?? null,
      consentTextVersion: '1.0',
    })
  } catch (err) {
    console.error('GET /api/patients/[id]/consent:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── POST — registrar consentimiento ──────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      select: { id: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const body = await req.json()
    const { consentType = 'HEALTH_DATA_PROCESSING', userAgent } = body

    const ip = getClientIp(req)

    const consent = await prisma.consentRecord.create({
      data: {
        patientId: params.id,
        doctorId: doctor.id,
        consentType,
        version: '1.0',
        text: CONSENT_TEXT_V1,
        ipAddress: ip,
        userAgent: userAgent ?? req.headers.get('user-agent') ?? null,
      },
    })

    await auditConsent(doctor.id, params.id, 'CREATE', {
      ip,
      consentType,
      version: '1.0',
    })

    return NextResponse.json({ consent }, { status: 201 })
  } catch (err) {
    console.error('POST /api/patients/[id]/consent:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── DELETE — revocar consentimiento ──────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const { reason } = body

    await prisma.consentRecord.updateMany({
      where: { patientId: params.id, doctorId: doctor.id, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason ?? 'Revocado por el médico responsable' },
    })

    await auditConsent(doctor.id, params.id, 'UPDATE', {
      ip: getClientIp(req),
      action: 'REVOKED',
      reason,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/patients/[id]/consent:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
