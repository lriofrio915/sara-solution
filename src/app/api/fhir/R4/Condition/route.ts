/**
 * GET /api/fhir/R4/Condition?patient={patientId}
 *
 * Retorna diagnósticos en formato FHIR R4 Condition.
 * Codificación dual: CIE-10 + ICD-11 (CIE-11).
 *
 * Requisito: AM 00068-2024, Agenda Digital Salud 2023-2027
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'security' }] }, { status: 401 })
    }

    const doctor = await getDoctorFromUser(user)
    if (!doctor) {
      return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'forbidden' }] }, { status: 403 })
    }

    const patientId = req.nextUrl.searchParams.get('patient')
    if (!patientId) {
      return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'patient parameter required' }] }, { status: 400 })
    }

    const diagnoses = await prisma.diagnosis.findMany({
      where: { doctorId: doctor.id, patientId },
      orderBy: { diagnosedAt: 'desc' },
    })

    const entries = diagnoses.map(dx => ({
      fullUrl: `https://consultorio.site/fhir/R4/Condition/${dx.id}`,
      resource: {
        resourceType: 'Condition',
        id: dx.id,
        meta: { lastUpdated: dx.updatedAt.toISOString() },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: dx.isDefinitive ? 'active' : 'provisional',
          }],
        },
        verificationStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: dx.isDefinitive ? 'confirmed' : 'provisional',
          }],
        },
        code: {
          coding: [
            // CIE-10 — compatibilidad ACESS Ecuador
            ...(dx.cie10Code ? [{
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: dx.cie10Code,
              display: dx.cie10Desc ?? undefined,
            }] : []),
            // ICD-11 / CIE-11 — estándar OMS
            ...(dx.icd11Code ? [{
              system: 'http://id.who.int/icd/release/11/mms',
              code: dx.icd11Code,
              display: dx.icd11Title ?? undefined,
            }] : []),
          ],
          text: dx.cie10Desc ?? dx.icd11Title ?? 'Diagnóstico',
        },
        subject: { reference: `Patient/${dx.patientId}` },
        recordedDate: dx.diagnosedAt.toISOString().slice(0, 10),
        recorder: { reference: `Practitioner/${dx.doctorId}` },
        note: dx.observations ? [{ text: dx.observations }] : undefined,
        onsetDateTime: dx.diagnosedAt.toISOString(),
        extension: [
          { url: 'https://consultorio.site/fhir/extensions/is-new', valueBoolean: dx.isNew },
          { url: 'https://consultorio.site/fhir/extensions/is-definitive', valueBoolean: dx.isDefinitive },
        ],
      },
    }))

    return NextResponse.json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: entries.length,
      entry: entries,
    }, { headers: { 'Content-Type': 'application/fhir+json' } })
  } catch (err) {
    console.error('FHIR GET /Condition:', err)
    return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception' }] }, { status: 500 })
  }
}
