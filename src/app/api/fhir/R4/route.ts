/**
 * GET /api/fhir/R4
 *
 * FHIR R4 CapabilityStatement (metadata)
 * Describe los recursos FHIR disponibles en este servidor.
 *
 * Requisito: AM 00068-2024 + Agenda Digital de Salud 2023-2027
 * Obligatoriedad de interoperabilidad HL7 FHIR R4 para la Red Privada Complementaria.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const capability = {
    resourceType: 'CapabilityStatement',
    id: 'medsara-fhir-server',
    status: 'active',
    date: '2026-03-25',
    publisher: 'Nexus Automatizaciones — MedSara',
    description: 'Servidor FHIR R4 de MedSara. Implementa interoperabilidad conforme a AM 00068-2024 y Agenda Digital de Salud Ecuador 2023-2027.',
    kind: 'instance',
    fhirVersion: '4.0.1',
    format: ['application/fhir+json'],
    rest: [
      {
        mode: 'server',
        security: {
          description: 'Autenticación JWT Bearer via Supabase Auth. Include Authorization: Bearer <token>',
        },
        resource: [
          { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }] },
          { type: 'Practitioner', interaction: [{ code: 'read' }] },
          { type: 'Condition', interaction: [{ code: 'read' }, { code: 'search-type' }] },
          { type: 'MedicationRequest', interaction: [{ code: 'read' }, { code: 'search-type' }] },
          { type: 'Observation', interaction: [{ code: 'read' }, { code: 'search-type' }] },
          { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        ],
      },
    ],
  }

  return NextResponse.json(capability, {
    headers: { 'Content-Type': 'application/fhir+json' },
  })
}
