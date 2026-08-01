/**
 * GET /api/documents/[type]/[id]/download
 *
 * Generates a PDF from the existing print page, optionally signs it with
 * the doctor's FirmaEC certificate, and returns the file for download.
 *
 * Supported types: prescriptions | certificates | exam-orders
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import { generatePdfFromPrintPage } from '@/lib/pdf-generator'
import { signPdf, decryptPassword, validateP12 } from '@/lib/firma-ec'

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

export async function GET(req: NextRequest, props: { params: Promise<{ type: string; id: string }> }) {
  const params = await props.params;
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

    // 7. Determine signature availability
    const canApplySignature = userRef.role === 'OWNER' || assistantCanSign
    const hasSignatureConfigured = !!(
      canApplySignature &&
      doctor.signaturePath &&
      doctor.signatureIv &&
      doctor.signatureTag &&
      doctor.signatureEncPass
    )

    // 8. Prepare the P12 BEFORE rendering: the print page shows the FirmaEC
    // visual stamp ("Firmado electrónicamente por: <CN del certificado>"), so
    // we need the certificate subject up front. The .p12 is NOT an image —
    // passing a signed URL to it as <img src> renders a broken icon (bug fixed
    // here); the stamp is text, per the FirmaEC/BCE convention.
    let signWarning: string | undefined
    let p12Buffer: Buffer | undefined
    let p12Password: string | undefined
    let signedBy: string | undefined

    if (hasSignatureConfigured) {
      try {
        const storage = createAdminClient().storage
        const { data, error: dlError } = await storage
          .from('firma-ec')
          .download(doctor.signaturePath!.replace(/^firma-ec\//, ''))

        if (dlError) throw new Error(`Storage error: ${dlError.message}`)

        p12Buffer = Buffer.from(await data.arrayBuffer())
        p12Password = decryptPassword(doctor.signatureIv!, doctor.signatureTag!, doctor.signatureEncPass!)
        const validation = validateP12(p12Buffer, p12Password)
        if (!validation.valid) throw new Error(validation.error ?? 'Certificado .p12 inválido')
        signedBy = validation.subject || doctor.name
      } catch (prepErr) {
        // Certificado ilegible/expirado — generar sin firma con advertencia
        const msg = prepErr instanceof Error ? prepErr.message : String(prepErr)
        console.error('FirmaEC preparation failed:', msg)
        signWarning = msg
        p12Buffer = undefined
        p12Password = undefined
      }
    }
    // Sin certificado configurado NO es un error: el documento se emite con el
    // espacio de firma en blanco para que el médico lo firme a mano. Solo se
    // avisa cuando había un certificado y la firma falló (ej. expirado).

    // 9. Generate PDF — sin firma disponible se emite con el espacio en blanco
    // Read cookies from the request store, NOT the raw header: if getUser()
    // refreshed an expired access token (rotating the refresh token), the raw
    // header still carries the stale session and Puppeteer would be redirected
    // to /login by the middleware/PrintLayout.
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ')
    const printPath = `${PRINT_PATHS[type]}/${params.id}/imprimir`
    const pdfQuery = signedBy
      ? `?signedBy=${encodeURIComponent(signedBy)}&signedAt=${encodeURIComponent(new Date().toISOString())}`
      : ''
    const pdfPath = `${printPath}${pdfQuery}`
    let pdfBytes = await generatePdfFromPrintPage(pdfPath, cookieHeader)

    // 10. Apply digital signature (required by AM 0009-2017 for legal validity)
    let signed = false

    if (p12Buffer && p12Password) {
      try {
        pdfBytes = await signPdf(pdfBytes, p12Buffer, p12Password, {
          reason: `${FILE_LABELS[type]} firmado digitalmente por ${doctor.name}`,
          contactInfo: user.email ?? '',
          name: doctor.name,
          location: 'Ecuador',
        })
        signed = true
      } catch (signErr) {
        // Sign failure (ej: certificado expirado) — retornar error descriptivo
        const msg = signErr instanceof Error ? signErr.message : String(signErr)
        console.error('FirmaEC signing failed:', msg)
        signWarning = msg
      }
    }

    const filename = `${FILE_LABELS[type]}-${params.id.slice(-6)}${signed ? '-firmado' : '-sin-firma'}.pdf`
    const response = new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Signed': signed ? 'true' : 'false',
      },
    })

    if (signWarning) {
      response.headers.set('X-Sign-Warning', signWarning.slice(0, 500))
    }

    return response
  } catch (err) {
    console.error('GET /api/documents/[type]/[id]/download:', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Error generando PDF', detail }, { status: 500 })
  }
}
