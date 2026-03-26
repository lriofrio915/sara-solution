/**
 * GET /api/fhir/R4/Patient/{id}
 *
 * Retorna un paciente en formato FHIR R4 Patient resource.
 * Codificación conforme a: HL7 FHIR R4, ICD-10, identifiers Ecuador (cédula/pasaporte).
 *
 * Requisito: AM 00068-2024, Agenda Digital Salud 2023-2027
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

// Mapeo BloodType a SNOMED-CT
const BLOOD_TYPE_SNOMED: Record<string, string> = {
  A_POS: '112144000', A_NEG: '112143006',
  B_POS: '165743006', B_NEG: '165743006',
  AB_POS: '406128001', AB_NEG: '406128001',
  O_POS: '112148002', O_NEG: '112149005',
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'security', diagnostics: 'Unauthorized' }] }, { status: 401 })
    }

    const doctor = await getDoctorFromUser(user)
    if (!doctor) {
      return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'forbidden', diagnostics: 'Doctor not found' }] }, { status: 403 })
    }

    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id, deletedAt: null },
      include: { chart: true },
    })

    if (!patient) {
      return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }] }, { status: 404 })
    }

    // FHIR R4 Patient resource
    const fhirPatient = {
      resourceType: 'Patient',
      id: patient.id,
      meta: {
        lastUpdated: patient.updatedAt.toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/Patient'],
      },
      identifier: [
        ...(patient.documentId ? [{
          use: 'official',
          type: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: patient.documentType === 'PASAPORTE' ? 'PPN' : 'NI',
              display: patient.documentType === 'PASAPORTE' ? 'Passport Number' : 'Cédula de Identidad',
            }],
          },
          system: patient.documentType === 'PASAPORTE'
            ? 'urn:oid:2.16.840.1.113883.4.330.218'
            : 'urn:oid:1.2.840.114350.1.13.0.1.7.5.737384.4',  // Ecuador CI
          value: patient.documentId,
        }] : []),
        {
          system: 'https://consultorio.site/patients',
          value: patient.id,
        },
      ],
      active: patient.deletedAt === null,
      name: [{ use: 'official', text: patient.name }],
      telecom: [
        ...(patient.phone ? [{ system: 'phone', value: patient.phone, use: 'mobile' }] : []),
        ...(patient.email ? [{ system: 'email', value: patient.email }] : []),
      ],
      gender: patient.chart?.sex === 'M' ? 'male' : patient.chart?.sex === 'F' ? 'female' : 'unknown',
      birthDate: patient.birthDate ? patient.birthDate.toISOString().slice(0, 10) : undefined,
      address: patient.chart?.address ? [{ text: patient.chart.address, country: 'EC' }] : undefined,
      extension: [
        // Tipo de sangre — SNOMED-CT
        ...(patient.bloodType && patient.bloodType !== 'UNKNOWN' ? [{
          url: 'http://hl7.org/fhir/StructureDefinition/patient-bloodgroup',
          valueCodeableConcept: {
            coding: [{
              system: 'http://snomed.info/sct',
              code: BLOOD_TYPE_SNOMED[patient.bloodType] ?? '365637002',
              display: patient.bloodType.replace('_', ' '),
            }],
          },
        }] : []),
        // Alergias conocidas
        ...(patient.allergies.length > 0 ? [{
          url: 'https://consultorio.site/fhir/extensions/known-allergies',
          valueString: patient.allergies.join(', '),
        }] : []),
      ],
    }

    return NextResponse.json(fhirPatient, {
      headers: { 'Content-Type': 'application/fhir+json' },
    })
  } catch (err) {
    console.error('FHIR GET /Patient/[id]:', err)
    return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception', diagnostics: 'Internal error' }] }, { status: 500 })
  }
}
