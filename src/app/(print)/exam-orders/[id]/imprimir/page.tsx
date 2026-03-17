import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import PrintButton from '@/components/PrintButton'
import { EXAM_CATEGORIES } from '@/lib/exam-categories'

export const dynamic = 'force-dynamic'

async function getData(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true, specialty: true, email: true, phone: true, address: true, mspCode: true, whatsapp: true, specialtyRegCode: true, establishmentName: true, establishmentCode: true, establishmentRuc: true, province: true, canton: true },
  })
  if (!doctor) return null

  const order = await prisma.examOrder.findFirst({
    where: { id, doctorId: doctor.id },
    include: { patient: { select: { name: true, documentId: true, birthDate: true } } },
  })
  if (!order) return null

  return { doctor, order }
}

function calcAge(birthDate: Date | null): string {
  if (!birthDate) return ''
  return `${Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años`
}

export default async function ExamOrderPrintPage({ params }: { params: { id: string } }) {
  const data = await getData(params.id)
  if (!data) notFound()

  const { doctor, order } = data
  const exams = (order.exams ?? {}) as Record<string, string[]>

  const dateStr = new Date(order.date).toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Guayaquil',
  })

  const age = calcAge(order.patient.birthDate)

  const categoriesWithExams = EXAM_CATEGORIES.filter(c => (exams[c.key] ?? []).length > 0)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside, header, nav, .no-print { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; }
          @page { size: A4; margin: 10mm 12mm; }
          .print-page { box-shadow: none !important; }
          .exam-grid { break-inside: avoid; }
        }
      `}} />

      <div className="no-print flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <a href="/exam-orders" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">← Volver</a>
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
                  {doctor.establishmentName && <p className="text-xs text-gray-400 mb-1">{doctor.establishmentName}{doctor.establishmentCode ? ` — Cód. ${doctor.establishmentCode}` : ''}</p>}
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
          <div className="px-8 py-4 text-center border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-base uppercase tracking-wider">Orden de Exámenes de Laboratorio</h2>
          </div>

          {/* Patient info */}
          <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
              <div><span className="font-semibold text-gray-600">Paciente: </span><span className="text-gray-900">{order.patient.name}</span></div>
              {order.patient.documentId && <div><span className="font-semibold text-gray-600">Cédula: </span><span className="text-gray-900">{order.patient.documentId}</span></div>}
              {age && <div><span className="font-semibold text-gray-600">Edad: </span><span className="text-gray-900">{age}</span></div>}
              <div className="ml-auto"><span className="font-semibold text-gray-600">Fecha: </span><span className="text-gray-900">Tena, {dateStr}</span></div>
            </div>
          </div>

          {/* Exams grid */}
          <div className="px-8 py-6">
            {categoriesWithExams.length === 0 && order.otrosExams ? null : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                {categoriesWithExams.map(cat => (
                  <div key={cat.key} className="exam-grid">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary border-b border-primary/30 pb-1 mb-2">
                      {cat.label}
                    </h3>
                    <div className="space-y-1">
                      {(exams[cat.key] ?? []).map(exam => (
                        <div key={exam} className="flex items-center gap-2 text-sm text-gray-800">
                          <span className="w-4 h-4 border-2 border-gray-400 rounded-sm flex-shrink-0 flex items-center justify-center text-primary font-bold text-xs">✓</span>
                          {exam}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {order.otrosExams && (
              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary border-b border-primary/30 pb-1 mb-2">OTROS</h3>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{order.otrosExams}</p>
              </div>
            )}
          </div>

          {/* Signature */}
          <div className="px-8 py-6 border-t border-gray-200 flex justify-end">
            <div className="text-center">
              <div className="w-48 border-b-2 border-gray-400 mb-2 mx-auto" />
              <p className="font-bold text-gray-900 text-sm">{doctor.name}</p>
              <p className="text-xs text-gray-500">{doctor.specialty}</p>
              {doctor.mspCode && <p className="text-xs text-gray-500 mt-0.5">MSP: {doctor.mspCode}</p>}
              {doctor.specialtyRegCode && <p className="text-xs text-gray-500">Reg. Esp.: {doctor.specialtyRegCode}</p>}
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
