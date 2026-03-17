import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import PrintButton from '@/components/PrintButton'

export const dynamic = 'force-dynamic'

async function getData(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true, specialty: true, email: true, phone: true, address: true, mspCode: true, whatsapp: true, specialtyRegCode: true, province: true, canton: true },
  })
  if (!doctor) return null

  const certificate = await prisma.medicalCertificate.findFirst({
    where: { id, doctorId: doctor.id },
    include: { patient: { select: { name: true, documentId: true, birthDate: true, phone: true } } },
  })
  if (!certificate) return null

  const patientChart = await prisma.patientChart.findFirst({
    where: { patientId: certificate.patientId },
    select: { occupation: true, address: true },
  })

  return { doctor, certificate, patientChart }
}

function calcAge(birthDate: Date | null): string {
  if (!birthDate) return ''
  return `${Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años`
}

export default async function CertificatePrintPage({ params }: { params: { id: string } }) {
  const data = await getData(params.id)
  if (!data) notFound()

  const { doctor, certificate, patientChart } = data

  const dateStr = new Date(certificate.date).toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Guayaquil',
  })

  const age = calcAge(certificate.patient.birthDate)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside, header, nav, .no-print { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; }
          @page { size: A4; margin: 15mm 18mm; }
          .print-page { box-shadow: none !important; }
        }
      `}} />

      <div className="no-print flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <a href="/certificates" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">← Volver</a>
        <div className="flex-1" />
        <PrintButton />
      </div>

      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen py-8 px-4 print:bg-white print:p-0">
        <div className="print-page bg-white max-w-[794px] mx-auto shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">

          {/* Header */}
          <div className="border-b-4 border-primary px-8 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                  {doctor.name.charAt(0)}
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 text-lg leading-tight">{doctor.name}</h1>
                  <p className="text-primary font-medium text-sm">{doctor.specialty}</p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500 space-y-0.5">
                {doctor.whatsapp && <p>WhatsApp: {doctor.whatsapp}</p>}
                {doctor.email && <p>{doctor.email}</p>}
                {doctor.address && <p>{doctor.address}</p>}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="px-8 py-5 text-center border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-xl uppercase tracking-wider">Certificado Médico</h2>
          </div>

          {/* Body */}
          <div className="px-8 py-8 space-y-6 min-h-[400px]">
            {/* Doctor declaration */}
            <p className="text-sm text-gray-700 leading-relaxed">
              Yo, <strong>{doctor.name}</strong>, {doctor.specialty}, en calidad de médico tratante, certifico que:
            </p>

            {/* Patient data */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-1 text-sm">
              <div className="flex gap-6 flex-wrap">
                <div><span className="font-semibold text-gray-600">Paciente: </span><span className="text-gray-900">{certificate.patient.name}</span></div>
                {certificate.patient.documentId && (
                  <div><span className="font-semibold text-gray-600">C.I.: </span><span className="text-gray-900">{certificate.patient.documentId}</span></div>
                )}
                {age && <div><span className="font-semibold text-gray-600">Edad: </span><span className="text-gray-900">{age}</span></div>}
              </div>
              {patientChart?.occupation && <div><span className="font-semibold text-gray-600">Ocupación: </span><span className="text-gray-900">{patientChart.occupation}</span></div>}
              {patientChart?.address && <div><span className="font-semibold text-gray-600">Dirección: </span><span className="text-gray-900">{patientChart.address}</span></div>}
              <div><span className="font-semibold text-gray-600">Fecha de atención: </span><span className="text-gray-900">{doctor.canton || doctor.province || 'Tena'}, {dateStr}</span></div>
            </div>

            {/* Clinical data */}
            {(certificate.diagnosis || certificate.treatment) && (
              <div className="space-y-1 text-sm text-gray-700">
                {certificate.diagnosis && (
                  <p><span className="font-semibold">Diagnóstico: </span>{certificate.diagnosis}</p>
                )}
                {certificate.treatment && (
                  <p><span className="font-semibold">Tratamiento: </span>{certificate.treatment}</p>
                )}
              </div>
            )}

            {/* Main content */}
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {certificate.content}
            </div>

            {/* Rest days highlight */}
            {certificate.restDays && certificate.restDays > 0 && (
              <div className="border-2 border-primary/30 bg-primary/5 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-gray-700">
                  Se recomienda <span className="text-primary text-base font-bold">{certificate.restDays} días</span> de reposo
                </p>
              </div>
            )}
          </div>

          {/* Signature */}
          <div className="px-8 py-8 border-t border-gray-200">
            <div className="flex justify-between items-end">
              <div className="text-sm text-gray-600">
                <p>{doctor.canton || doctor.province || 'Tena'}, {dateStr}</p>
              </div>
              <div className="text-center">
                <div className="w-48 border-b-2 border-gray-400 mb-2 mx-auto" />
                <p className="font-bold text-gray-900 text-sm">{doctor.name}</p>
                <p className="text-xs text-gray-500">{doctor.specialty}</p>
                {doctor.mspCode && <p className="text-xs text-gray-500 mt-0.5">MSP: {doctor.mspCode}</p>}
                {doctor.specialtyRegCode && <p className="text-xs text-gray-500">Reg. Esp.: {doctor.specialtyRegCode}</p>}
              </div>
            </div>
          </div>

          <div className="px-8 py-3 bg-primary text-white text-xs flex flex-wrap items-center justify-between gap-2">
            <span>{doctor.name} — {doctor.specialty}</span>
            <span className="flex gap-4">
              {doctor.whatsapp && <span>WhatsApp: {doctor.whatsapp}</span>}
              {doctor.email && <span>{doctor.email}</span>}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
