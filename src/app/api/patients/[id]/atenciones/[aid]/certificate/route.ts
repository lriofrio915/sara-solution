import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; aid: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await getDoctorFromUser(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const attention = await prisma.attention.findFirst({
      where: { id: params.aid, patientId: params.id, doctorId: doctor.id },
      select: { id: true, datetime: true, patientId: true },
    })
    if (!attention) return NextResponse.json({ error: 'Attention not found' }, { status: 404 })

    const body = await req.json()
    const { tipo, diagnosis, description, restDays, restDateStart, restDateEnd } = body

    const contentLines: string[] = []
    if (tipo === 'reposo') {
      contentLines.push('El paciente requiere reposo médico.')
      if (restDays) contentLines.push(`Días de reposo indicados: ${restDays} días.`)
      if (restDateStart && restDateEnd) contentLines.push(`Período: del ${restDateStart} al ${restDateEnd}.`)
    } else if (tipo === 'salud') {
      contentLines.push('El paciente se encuentra en buen estado de salud general.')
    } else {
      contentLines.push('El paciente estuvo bajo atención médica en la fecha indicada.')
    }
    if (description?.trim()) contentLines.push(description.trim())

    const certificate = await prisma.medicalCertificate.create({
      data: {
        patientId: params.id,
        doctorId: doctor.id,
        date: attention.datetime,
        content: contentLines.join('\n'),
        diagnosis: diagnosis ?? null,
        restDays: restDays ? parseInt(String(restDays)) : null,
        restDateStart: restDateStart ? new Date(restDateStart) : null,
        restDateEnd: restDateEnd ? new Date(restDateEnd) : null,
      },
    })

    return NextResponse.json({ certificateId: certificate.id })
  } catch (err) {
    console.error('POST certificate from attention:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
