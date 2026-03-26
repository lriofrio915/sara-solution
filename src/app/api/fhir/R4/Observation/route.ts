/**
 * GET /api/fhir/R4/Observation?patient={patientId}
 *
 * Retorna signos vitales en formato FHIR R4 Observation.
 * Codificación: LOINC para cada signo vital.
 *
 * Requisito: AM 00068-2024, Agenda Digital Salud 2023-2027
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

// Mapeo signos vitales → LOINC
const VITAL_LOINC: Record<string, { code: string; display: string; unit: string; system: string }> = {
  peso:                 { code: '29463-7', display: 'Body weight', unit: 'kg', system: 'http://loinc.org' },
  talla:                { code: '8302-2', display: 'Body height', unit: 'cm', system: 'http://loinc.org' },
  imc:                  { code: '39156-5', display: 'Body mass index', unit: 'kg/m2', system: 'http://loinc.org' },
  pasSistolica:         { code: '8480-6', display: 'Systolic blood pressure', unit: 'mmHg', system: 'http://loinc.org' },
  pasDiastolica:        { code: '8462-4', display: 'Diastolic blood pressure', unit: 'mmHg', system: 'http://loinc.org' },
  frecuenciaCardiaca:   { code: '8867-4', display: 'Heart rate', unit: '/min', system: 'http://loinc.org' },
  frecuenciaRespiratoria: { code: '9279-1', display: 'Respiratory rate', unit: '/min', system: 'http://loinc.org' },
  temperatura:          { code: '8310-5', display: 'Body temperature', unit: 'Cel', system: 'http://loinc.org' },
  saturacionO2:         { code: '59408-5', display: 'Oxygen saturation', unit: '%', system: 'http://loinc.org' },
  perimetroCefalico:    { code: '9843-4', display: 'Head circumference', unit: 'cm', system: 'http://loinc.org' },
}

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

    const atenciones = await prisma.attention.findMany({
      where: { doctorId: doctor.id, patientId },
      select: { id: true, datetime: true, exploration: true },
      orderBy: { datetime: 'desc' },
    })

    const entries: object[] = []

    for (const att of atenciones) {
      if (!att.exploration || typeof att.exploration !== 'object') continue
      const exp = att.exploration as Record<string, string>

      for (const [field, loinc] of Object.entries(VITAL_LOINC)) {
        const rawVal = exp[field]
        if (!rawVal || rawVal.trim() === '') continue
        const numVal = parseFloat(rawVal)
        if (isNaN(numVal)) continue

        entries.push({
          fullUrl: `https://consultorio.site/fhir/R4/Observation/${att.id}-${field}`,
          resource: {
            resourceType: 'Observation',
            id: `${att.id}-${field}`,
            status: 'final',
            category: [{
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              }],
            }],
            code: {
              coding: [{ system: loinc.system, code: loinc.code, display: loinc.display }],
              text: loinc.display,
            },
            subject: { reference: `Patient/${patientId}` },
            effectiveDateTime: att.datetime.toISOString(),
            valueQuantity: {
              value: numVal,
              unit: loinc.unit,
              system: 'http://unitsofmeasure.org',
              code: loinc.unit,
            },
          },
        })
      }
    }

    return NextResponse.json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: entries.length,
      entry: entries,
    }, { headers: { 'Content-Type': 'application/fhir+json' } })
  } catch (err) {
    console.error('FHIR GET /Observation:', err)
    return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception' }] }, { status: 500 })
  }
}
