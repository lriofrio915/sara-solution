/**
 * GET /api/fhir/R4/Practitioner/{id}
 *
 * Retorna datos del médico en formato FHIR R4 Practitioner.
 * Incluye identificadores: cédula, código MSP, registro SENESCYT.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'security' }] }, { status: 401 })
    }

    const doctor = await prisma.doctor.findFirst({
      where: { id: params.id },
      select: {
        id: true, name: true, specialty: true, email: true, phone: true, address: true,
        cedulaId: true, mspCode: true, specialtyRegCode: true,
        establishmentName: true, establishmentCode: true, province: true, canton: true,
        createdAt: true, updatedAt: true,
      },
    })

    if (!doctor) {
      return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] }, { status: 404 })
    }

    const fhirPractitioner = {
      resourceType: 'Practitioner',
      id: doctor.id,
      meta: { lastUpdated: doctor.updatedAt.toISOString() },
      identifier: [
        ...(doctor.cedulaId ? [{
          use: 'official',
          type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'NI', display: 'Cédula de Identidad Ecuador' }] },
          system: 'urn:oid:1.2.840.114350.1.13.0.1.7.5.737384.4',
          value: doctor.cedulaId,
        }] : []),
        ...(doctor.mspCode ? [{
          use: 'official',
          type: { coding: [{ system: 'https://www.salud.gob.ec', code: 'MSP', display: 'Código MSP/ACESS' }] },
          system: 'https://www.salud.gob.ec/registry/professionals',
          value: doctor.mspCode,
        }] : []),
        ...(doctor.specialtyRegCode ? [{
          use: 'official',
          type: { coding: [{ system: 'https://www.senescyt.gob.ec', code: 'SENESCYT', display: 'Registro SENESCYT Especialidad' }] },
          system: 'https://www.senescyt.gob.ec/registry/professionals',
          value: doctor.specialtyRegCode,
        }] : []),
      ],
      active: true,
      name: [{ use: 'official', text: doctor.name }],
      telecom: [
        ...(doctor.phone ? [{ system: 'phone', value: doctor.phone }] : []),
        ...(doctor.email ? [{ system: 'email', value: doctor.email }] : []),
      ],
      address: doctor.address ? [{ text: doctor.address, country: 'EC', state: doctor.province ?? undefined, city: doctor.canton ?? undefined }] : undefined,
      qualification: [{
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '309343006', display: 'Physician' }],
          text: doctor.specialty,
        },
        identifier: doctor.specialtyRegCode ? [{ value: doctor.specialtyRegCode }] : [],
      }],
    }

    return NextResponse.json(fhirPractitioner, {
      headers: { 'Content-Type': 'application/fhir+json' },
    })
  } catch (err) {
    console.error('FHIR GET /Practitioner/[id]:', err)
    return NextResponse.json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception' }] }, { status: 500 })
  }
}
