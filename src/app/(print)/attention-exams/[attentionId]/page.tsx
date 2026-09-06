import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import PrintButton from '@/components/PrintButton'
import Link from 'next/link'
import { EXAM_CATEGORIES } from '@/lib/exam-categories'
import { splitExamsByType, selectedCategories } from '@/lib/exam-split'

export const dynamic = 'force-dynamic'

export default async function AttentionExamsPrintPage(props: { params: Promise<{ attentionId: string }> }) {
  const { attentionId } = await props.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true, name: true, specialty: true, email: true, phone: true, address: true, whatsapp: true, mspCode: true, specialtyRegCode: true, establishmentName: true },
  })
  if (!doctor) notFound()

  const attention = await prisma.attention.findFirst({
    where: { id: attentionId, doctorId: doctor.id },
    include: { patient: { select: { name: true, documentId: true, birthDate: true } } },
  })
  if (!attention) notFound()

  const dateStr = new Date(attention.datetime).toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Guayaquil',
  })

  // Esta orden es SOLO de laboratorio. Antes se recorrían todas las claves del JSON
  // `exams`, que guarda laboratorio e imagen juntos, y la orden impresa salía mezclada:
  // un pedido clínico con exámenes que no le corresponden. Se filtra contra el catálogo
  // de laboratorio, el mismo criterio que ya usa /exam-orders/[id]/imprimir.
  const { lab } = splitExamsByType(attention.exams)
  const selectedExams = selectedCategories(lab, EXAM_CATEGORIES)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside, header, nav, .no-print { display: none !important; }
          body { background: white !important; }
          @page { size: A4; margin: 15mm 18mm; }
        }
      `}} />

      <div className="no-print flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Link href={`/patients/${attention.patientId}/atenciones/${attentionId}`} className="text-sm text-gray-500 hover:text-gray-700">← Volver</Link>
        <div className="flex-1" />
        <PrintButton />
      </div>

      <div className="bg-gray-100 min-h-screen py-8 px-4 print:bg-white print:p-0">
        <div className="bg-white max-w-[794px] mx-auto shadow-lg rounded-lg overflow-hidden print:shadow-none">
          <div className="border-b-4 border-primary px-8 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-bold text-gray-900 text-lg">{doctor.name}</h1>
                <p className="text-primary font-medium text-sm">{doctor.specialty}</p>
                {doctor.establishmentName && <p className="text-gray-500 text-sm">{doctor.establishmentName}</p>}
              </div>
              <div className="text-right text-xs text-gray-500 space-y-0.5">
                {doctor.whatsapp && <p>WhatsApp: {doctor.whatsapp}</p>}
                {doctor.email && <p>{doctor.email}</p>}
                {doctor.address && <p>{doctor.address}</p>}
              </div>
            </div>
          </div>

          <div className="px-8 py-4 text-center border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-xl uppercase tracking-wider">Orden de Exámenes de Laboratorio</h2>
          </div>

          <div className="px-8 py-6 space-y-5">
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-sm space-y-1">
              <p><span className="font-semibold">Paciente: </span>{attention.patient.name}</p>
              {attention.patient.documentId && <p><span className="font-semibold">C.I.: </span>{attention.patient.documentId}</p>}
              <p><span className="font-semibold">Fecha: </span>{dateStr}</p>
            </div>

            {selectedExams.length > 0 ? (
              <div className="space-y-4">
                {selectedExams.map(({ category, items, otros }) => (
                  <div key={category.key}>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 border-b border-gray-200 pb-1">{category.label}</h3>
                    <ul className="space-y-1">
                      {items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-800">
                          <span className="w-4 h-4 border border-gray-400 rounded-sm flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    {otros && (
                      <p className="text-sm text-gray-600 mt-1">Otros: {otros}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No hay exámenes seleccionados.</p>
            )}

            <div className="pt-8 flex justify-end">
              <div className="text-center text-sm">
                <div className="w-48 border-b-2 border-gray-400 mb-2 mx-auto" />
                <p className="font-bold text-gray-900">{doctor.name}</p>
                <p className="text-gray-500 text-xs">{doctor.specialty}</p>
                {doctor.mspCode && <p className="text-xs text-gray-400">MSP: {doctor.mspCode}</p>}
                {doctor.specialtyRegCode && <p className="text-xs text-gray-400">Reg. Esp.: {doctor.specialtyRegCode}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
