/**
 * GET /api/documents/[type]/[id]/download
 *
 * Generates a PDF from the existing print page, optionally signs it with
 * the doctor's FirmaEC certificate, and returns the file for download.
 *
 * Supported types: prescriptions | certificates | exam-orders
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { generatePdfFromPrintPage } from '@/lib/pdf-generator'
import { signPdf, decryptPassword } from '@/lib/firma-ec'

export const dynamic = 'force-dynamic'
// PDF generation can take a few seconds
export const maxDuration = 60

const ALLOWED_TYPES = ['prescriptions', 'certificates', 'exam-orders'] as const
type DocType = (typeof ALLOWED_TYPES)[number]

const PRINT_PATHS: Record<DocType, string> = {
  prescriptions: '/prescriptions',
  certificates:  '/certificates',
  'exam-orders': '/exam-orders',
}

const FILE_LABELS: Record<DocType, string> = {
  prescriptions: 'Receta',
  certificates:  'Certificado',
  'exam-orders': 'OrdenExamenes',
}

async function verifyOwnership(type: DocType, id: string, doctorId: string): Promise<boolean> {
  switch (type) {
    case 'prescriptions':
      return !!(await prisma.prescription.findFirst({ where: { id, doctorId }, select: { id: true } }))
    case 'certificates':
      return !!(await prisma.medicalCertificate.findFirst({ where: { id, doctorId }, select: { id: true } }))
    case 'exam-orders':
      return !!(await prisma.examOrder.findFirst({ where: { id, doctorId }, select: { id: true } }))
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string; id: string } },
) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Validate type
    const type = params.type as DocType
    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Tipo de documento no válido' }, { status: 400 })
    }

    // 3. Resolve who is making the request (OWNER or ASSISTANT)
    const userRef = await getDoctorFromUser(user)
    if (!userRef) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    // 4. If ASSISTANT, check canSign permission before we fetch signature fields
    let assistantCanSign = false
    if (userRef.role === 'ASSISTANT') {
      const member = await prisma.doctorMember.findFirst({
        where: { authId: user.id, doctorId: userRef.id, active: true },
        select: { canSign: true },
      })
      assistantCanSign = member?.canSign ?? false
    }

    // 5. Fetch doctor's full info including signature fields
    const doctor = await prisma.doctor.findFirst({
      where: { id: userRef.id },
      select: {
        id: true,
        name: true,
        signaturePath: true,
        signatureIv: true,
        signatureTag: true,
        signatureEncPass: true,
      },
    })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    // 6. Verify document belongs to this doctor
    const owned = await verifyOwnership(type, params.id, doctor.id)
    if (!owned) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

    // 7. Generate PDF from print page
    const cookieHeader = req.headers.get('cookie') ?? ''
    const printPath = `${PRINT_PATHS[type]}/${params.id}/imprimir`
    let pdfBytes = await generatePdfFromPrintPage(printPath, cookieHeader)

    // 8. Apply digital signature if doctor has FirmaEC configured
    //    ASSISTANT can only sign if the doctor has granted canSign permission
    const canApplySignature = userRef.role === 'OWNER' || assistantCanSign
    let signed = false
    if (canApplySignature && doctor.signaturePath && doctor.signatureIv && doctor.signatureTag && doctor.signatureEncPass) {
      try {
        // Download .p12 from private Supabase Storage bucket
        const storage = createAdminClient().storage
        const { data, error: dlError } = await storage
          .from('firma-ec')
          .download(doctor.signaturePath.replace(/^firma-ec\//, ''))

        if (dlError) throw new Error(`Storage error: ${dlError.message}`)

        const p12Buffer = Buffer.from(await data.arrayBuffer())
        const password = decryptPassword(doctor.signatureIv, doctor.signatureTag, doctor.signatureEncPass)

        pdfBytes = await signPdf(pdfBytes, p12Buffer, password, {
          reason: `${FILE_LABELS[type]} firmado digitalmente por ${doctor.name}`,
          contactInfo: user.email ?? '',
          name: doctor.name,
          location: 'Ecuador',
        })
        signed = true
      } catch (signErr) {
        // Sign failure is non-fatal — return unsigned PDF with warning header
        console.error('FirmaEC signing failed, returning unsigned PDF:', signErr)
      }
    }

    // 7. Return PDF
    const filename = `${FILE_LABELS[type]}-${params.id.slice(-6)}${signed ? '-firmado' : ''}.pdf`
    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Signed': signed ? 'true' : 'false',
      },
    })
  } catch (err) {
    console.error('GET /api/documents/[type]/[id]/download:', err)
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 })
  }
}
