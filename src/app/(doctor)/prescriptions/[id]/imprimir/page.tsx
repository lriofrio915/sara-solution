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
    select: { id: true, name: true, specialty: true, email: true, phone: true, address: true },
  })
  if (!doctor) return null

  const prescription = await prisma.prescription.findFirst({
    where: { id, doctorId: doctor.id },
    include: {
      patient: { select: { name: true, documentId: true, birthDate: true } },
    },
  })
  if (!prescription) return null

  return { doctor, prescription }
}

function calcAge(birthDate: Date | null): string {
  if (!birthDate) return ''
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  return `${age} años`
}

export default async function PrescriptionPrintPage({ params }: { params: { id: string } }) {
  const data = await getData(params.id)
  if (!data) notFound()

  const { doctor, prescription } = data
  const medications = prescription.medications as Array<{
    name: string; dose: string; frequency: string; duration: string; notes?: string
  }>

  const dateStr = new Date(prescription.date).toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Guayaquil',
  })

  const age = calcAge(prescription.patient.birthDate)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside, header, nav, .no-print { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; }
          @page { size: A4; margin: 12mm 15mm; }
          .print-page { box-shadow: none !important; }
        }
      `}} />

      {/* Print button - hidden when printing */}
      <div className="no-print flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <a href="/prescriptions" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">← Volver</a>
        <div className="flex-1" />
        <PrintButton />
      </div>

      {/* Document */}
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
                {doctor.phone && <p>Tel: {doctor.phone}</p>}
                {doctor.email && <p>{doctor.email}</p>}
                {doctor.address && <p>{doctor.address}</p>}
              </div>
            </div>
          </div>

          {/* Patient info */}
          <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Paciente: </span>
                <span className="text-gray-900">{prescription.patient.name}</span>
              </div>
              {prescription.patient.documentId && (
                <div>
                  <span className="font-semibold text-gray-600">Cédula: </span>
                  <span className="text-gray-900">{prescription.patient.documentId}</span>
                </div>
              )}
              {age && (
                <div>
                  <span className="font-semibold text-gray-600">Edad: </span>
                  <span className="text-gray-900">{age}</span>
                </div>
              )}
              <div className="ml-auto">
                <span className="font-semibold text-gray-600">Fecha: </span>
                <span className="text-gray-900">Tena, {dateStr}</span>
              </div>
            </div>
            {prescription.diagnosis && (
              <p className="text-sm mt-1.5">
                <span className="font-semibold text-gray-600">Diagnóstico: </span>
                <span className="text-gray-900">{prescription.diagnosis}</span>
              </p>
            )}
          </div>

          {/* Two columns */}
          <div className="px-8 py-6 grid grid-cols-2 gap-6 min-h-[360px]">
            {/* Left: PRESCRIPCIÓN */}
            <div className="border-r border-gray-200 pr-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-4 border-b border-primary/30 pb-2">
                Prescripción
              </h2>
              <div className="space-y-4">
                {medications.map((med, i) => (
                  <div key={i}>
                    <p className="font-bold text-gray-900 text-sm">
                      <span className="text-primary mr-1">Rp.</span>
                      {med.name}
                    </p>
                    {med.dose && <p className="text-sm text-gray-700 ml-4">Dosis: {med.dose}</p>}
                    {med.frequency && <p className="text-sm text-gray-700 ml-4">Frecuencia: {med.frequency}</p>}
                    {med.duration && <p className="text-sm text-gray-700 ml-4">Duración: {med.duration}</p>}
                    {med.notes && <p className="text-xs text-gray-500 ml-4 italic">{med.notes}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: INDICACIONES */}
            <div className="pl-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-4 border-b border-primary/30 pb-2">
                Indicaciones
              </h2>
              {prescription.instructions ? (
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {prescription.instructions}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Sin indicaciones adicionales</p>
              )}
            </div>
          </div>

          {/* Footer / Signature */}
          <div className="px-8 py-6 border-t border-gray-200 flex justify-end">
            <div className="text-center">
              <div className="w-48 border-b-2 border-gray-400 mb-2 mx-auto" />
              <p className="font-bold text-gray-900 text-sm">{doctor.name}</p>
              <p className="text-xs text-gray-500">{doctor.specialty}</p>
            </div>
          </div>

          {/* Page footer */}
          <div className="px-8 py-3 bg-primary text-white text-xs flex flex-wrap items-center justify-between gap-2">
            <span>{doctor.name} — {doctor.specialty}</span>
            <span className="flex gap-4">
              {doctor.phone && <span>Tel: {doctor.phone}</span>}
              {doctor.email && <span>{doctor.email}</span>}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
