/**
 * GET /api/fhir/R4/MedicationRequest?patient={patientId}
 *
 * Retorna recetas médicas en formato FHIR R4 MedicationRequest.
 * Codificación: DCI/ATC para medicamentos, CIE-10 para diagnóstico indicado.
 *
 * Requisito: AM 00068-2024, ACESS-2023-0030
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

interface MedItem {
  dci?: string
  name?: string
  dose?: string
  pharmaceuticalForm?: string
  route?: string
  frequency?: string
  duration?: string
  notes?: string
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'security', diagnostics: 'Unauthorized' }] }, { status: 401 })
    }

    const doctor = await getDoctorFromUser(user)
    if (!doctor) {
      return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'forbidden' }] }, { status: 403 })
    }

    const patientId = req.nextUrl.searchParams.get('patient')
    if (!patientId) {
      return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'patient parameter required' }] }, { status: 400 })
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { doctorId: doctor.id, patientId },
      include: { patient: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    })

    const entries = prescriptions.flatMap(rx => {
      const meds = Array.isArray(rx.medications) ? rx.medications as MedItem[] : []
      return meds.map((med, idx) => {
        const displayName = med.dci || med.name || 'Medicamento'
        return {
          fullUrl: `https://consultorio.site/fhir/R4/MedicationRequest/${rx.id}-${idx}`,
          resource: {
            resourceType: 'MedicationRequest',
            id: `${rx.id}-${idx}`,
            meta: { lastUpdated: rx.updatedAt.toISOString() },
            status: rx.expiresAt && new Date(rx.expiresAt) < new Date() ? 'completed' : 'active',
            intent: 'order',
            medicationCodeableConcept: {
              coding: [
                {
                  system: 'https://www.whocc.no/atc',
                  display: med.dci ?? displayName,
                },
              ],
              text: displayName + (med.name && med.dci ? ` (${med.name})` : ''),
            },
            subject: {
              reference: `Patient/${rx.patientId}`,
              display: rx.patient.name,
            },
            authoredOn: rx.issuedAt.toISOString(),
            requester: { reference: `Practitioner/${rx.doctorId}` },
            reasonCode: rx.diagnosis ? [{
              coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: rx.diagnosis }],
              text: rx.diagnosis,
            }] : undefined,
            dosageInstruction: [{
              text: [med.frequency, med.duration].filter(Boolean).join(', ') || undefined,
              route: med.route ? { coding: [{ display: med.route }], text: med.route } : undefined,
              doseAndRate: med.dose ? [{
                doseQuantity: { value: parseFloat(med.dose) || undefined, unit: med.dose.replace(/[\d.]/g, '').trim() || undefined },
              }] : undefined,
            }],
            dispenseRequest: {
              validityPeriod: rx.expiresAt ? { end: new Date(rx.expiresAt).toISOString().slice(0, 10) } : undefined,
              quantity: med.duration ? { value: parseInt(med.duration) || undefined, unit: med.pharmaceuticalForm || undefined } : undefined,
            },
            identifier: [{ system: 'https://consultorio.site/prescriptions', value: rx.rxNumber ?? rx.id }],
          },
        }
      })
    })

    return NextResponse.json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: entries.length,
      entry: entries,
    }, { headers: { 'Content-Type': 'application/fhir+json' } })
  } catch (err) {
    console.error('FHIR GET /MedicationRequest:', err)
    return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception' }] }, { status: 500 })
  }
}
