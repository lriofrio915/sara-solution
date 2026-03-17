import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

async function getDoctor(user: { id: string; email?: string | null }) {
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true, specialty: true },
  })
}

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no está configurada')
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'MedSara',
    },
  })
}

const MODEL = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat-v3-0324'

// POST /api/patients/[id]/ai-analysis
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    // Fetch complete patient data
    const patient = await prisma.patient.findFirst({
      where: { id: params.id, doctorId: doctor.id },
      include: {
        chart: true,
        attentions: {
          orderBy: { datetime: 'desc' },
          take: 10,
        },
        prescriptions: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        medicalRecords: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    // Fetch doctor knowledge documents
    const knowledgeDocs = await prisma.knowledgeDocument.findMany({
      where: { doctorId: doctor.id },
      select: { name: true, textContent: true },
      take: 5,
    })

    // Build clinical prompt
    const calcAge = (birthDate: Date | null) => {
      if (!birthDate) return 'No especificada'
      const diff = Date.now() - birthDate.getTime()
      return `${Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))} años`
    }

    const chart = patient.chart as Record<string, unknown> | null

    let clinicalInfo = `## HISTORIA CLÍNICA DEL PACIENTE

**Nombre:** ${patient.name}
**Edad:** ${calcAge(patient.birthDate)}
**Tipo de sangre:** ${patient.bloodType}
**Alergias:** ${patient.allergies.length > 0 ? patient.allergies.join(', ') : 'Ninguna registrada'}
`

    if (chart) {
      clinicalInfo += `
**Sexo:** ${chart.sex ?? 'No especificado'}
**Estado civil:** ${chart.maritalStatus ?? 'No especificado'}
**Estado del paciente:** ${chart.patientStatus ?? 'No especificado'}
**Seguro médico:** ${chart.insurance ?? 'No especificado'}
`
      if (chart.alert1 || chart.alert2 || chart.alert3) {
        clinicalInfo += `\n### ⚠️ ALERTAS CLÍNICAS:\n`
        if (chart.alert1) clinicalInfo += `- ${chart.alert1}\n`
        if (chart.alert2) clinicalInfo += `- ${chart.alert2}\n`
        if (chart.alert3) clinicalInfo += `- ${chart.alert3}\n`
      }
      if (chart.heredoFamiliar) {
        clinicalInfo += `\n### Antecedentes Heredo-Familiares:\n${JSON.stringify(chart.heredoFamiliar, null, 2)}\n`
      }
      if (chart.personalPathologic) {
        clinicalInfo += `\n### Antecedentes Personales Patológicos:\n${JSON.stringify(chart.personalPathologic, null, 2)}\n`
      }
      if (chart.personalNonPathologic) {
        clinicalInfo += `\n### Antecedentes Personales No Patológicos:\n${JSON.stringify(chart.personalNonPathologic, null, 2)}\n`
      }
      if (chart.gynecoObstetric) {
        clinicalInfo += `\n### Antecedentes Gineco-Obstétricos:\n${JSON.stringify(chart.gynecoObstetric, null, 2)}\n`
      }
    }

    if (patient.attentions.length > 0) {
      clinicalInfo += `\n### Atenciones Recientes:\n`
      for (const att of patient.attentions) {
        const attRecord = att as Record<string, unknown>
        clinicalInfo += `
**Fecha:** ${new Date(att.datetime).toLocaleDateString('es-EC')}
**Servicio:** ${att.service ?? 'No especificado'}
**Motivo:** ${att.motive ?? 'No especificado'}
**Evolución:** ${att.evolution ?? 'No registrada'}
`
        if (attRecord.diagnoses) {
          clinicalInfo += `**Diagnósticos:** ${JSON.stringify(attRecord.diagnoses)}\n`
        }
        if (attRecord.exploration) {
          clinicalInfo += `**Exploración/Signos Vitales:** ${JSON.stringify(attRecord.exploration)}\n`
        }
        clinicalInfo += '---\n'
      }
    }

    if (patient.prescriptions.length > 0) {
      clinicalInfo += `\n### Recetas Recientes:\n`
      for (const pres of patient.prescriptions) {
        clinicalInfo += `- ${new Date(pres.date).toLocaleDateString('es-EC')}: ${JSON.stringify(pres.medications)}\n`
      }
    }

    if (patient.medicalRecords.length > 0) {
      clinicalInfo += `\n### Historial Médico:\n`
      for (const rec of patient.medicalRecords) {
        clinicalInfo += `- ${new Date(rec.createdAt).toLocaleDateString('es-EC')}: **${rec.diagnosis}** ${rec.treatment ? `| Tratamiento: ${rec.treatment}` : ''}\n`
      }
    }

    // Add knowledge documents
    let knowledgeContext = ''
    const sourceNames: string[] = []
    if (knowledgeDocs.length > 0) {
      knowledgeContext = '\n\n## DOCUMENTOS DE CONOCIMIENTO DEL MÉDICO:\n'
      for (const doc of knowledgeDocs) {
        sourceNames.push(doc.name)
        knowledgeContext += `\n### [Fuente: ${doc.name}]\n${doc.textContent.slice(0, 2000)}\n`
      }
    }

    const systemPrompt = `Eres Sara, asistente médico IA del Dr. ${doctor.name}, especialista en ${doctor.specialty}.
Analiza la historia clínica del paciente y proporciona recomendaciones clínicas fundamentadas y detalladas.
Cuando uses información de los documentos de conocimiento del médico, CITA LA FUENTE con [Fuente: nombre del documento].
Responde siempre en español con formato markdown.
Sé específico, útil y clínico. Incluye:
1. Resumen del estado actual del paciente
2. Patrones clínicos relevantes identificados
3. Riesgos o alertas importantes
4. Recomendaciones diagnósticas y terapéuticas
5. Seguimiento sugerido`

    const client = getOpenRouterClient()
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: clinicalInfo + knowledgeContext + '\n\nPor favor analiza esta historia clínica y proporciona tus recomendaciones.' },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    })

    const analysis = response.choices[0]?.message?.content ?? 'No se pudo generar el análisis.'

    // Extract sources mentioned in the analysis
    const mentionedSources = sourceNames.filter((name) =>
      analysis.toLowerCase().includes(name.toLowerCase())
    )

    return NextResponse.json({ analysis, sources: mentionedSources })
  } catch (err) {
    console.error('POST /api/patients/[id]/ai-analysis:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
