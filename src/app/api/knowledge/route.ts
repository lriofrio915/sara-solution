import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const BUCKET = 'knowledge'
const MAX_TEXT_LENGTH = 150_000

async function getDoctor(user: { id: string; email?: string | null }) {
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
}

async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default
      const result = await pdfParse(buffer)
      return result.text?.trim() || `[PDF sin texto extraíble: ${filename}]`
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value?.trim() || `[Word sin texto extraíble: ${filename}]`
    }

    if (mimeType === 'text/plain' || mimeType === 'text/csv') {
      return buffer.toString('utf-8')
    }

    if (mimeType === 'application/msword') {
      return `[Archivo Word (.doc) legacy: ${filename}]\nConvierte a .docx para extracción de texto completa.`
    }

    if (mimeType.startsWith('application/vnd.ms-excel') || mimeType.includes('spreadsheetml')) {
      return `[Hoja de cálculo: ${filename}]\nEl contenido tabular está disponible en el archivo almacenado.`
    }

    return `[Documento: ${filename}]\n[Tipo: ${mimeType}]\nArchivo subido para referencia.`
  } catch (err) {
    console.error('Text extraction error:', err)
    return `[${filename}] (error al extraer texto — el archivo está guardado)`
  }
}

// ─── GET /api/knowledge ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })

    const docs = await prisma.knowledgeDocument.findMany({
      where: { doctorId: doctor.id },
      select: { id: true, name: true, size: true, mimeType: true, createdAt: true, textContent: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      documents: docs.map((d) => ({
        id: d.id,
        name: d.name,
        size: d.size,
        mimeType: d.mimeType,
        createdAt: d.createdAt,
        charCount: d.textContent?.length ?? 0,
      })),
    })
  } catch (err) {
    console.error('GET /api/knowledge:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── POST /api/knowledge ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `Tipo de archivo no soportado: ${file.type}` }, { status: 400 })
    }

    const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo no puede superar 20 MB' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Server-side text extraction
    const rawText = await extractText(buffer, file.type, file.name)
    const textContent = rawText.slice(0, MAX_TEXT_LENGTH)

    // Upload to Supabase Storage
    const admin = createAdminClient()
    const storagePath = `${doctor.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Error al subir el archivo al almacenamiento' }, { status: 500 })
    }

    const doc = await prisma.knowledgeDocument.create({
      data: {
        doctorId: doctor.id,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        storagePath,
        textContent,
      },
      select: { id: true, name: true, size: true, mimeType: true, createdAt: true, textContent: true },
    })

    return NextResponse.json({
      document: {
        id: doc.id,
        name: doc.name,
        size: doc.size,
        mimeType: doc.mimeType,
        createdAt: doc.createdAt,
        charCount: doc.textContent?.length ?? 0,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/knowledge:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── DELETE /api/knowledge?id=xxx ─────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const doctor = await getDoctor(user)
    if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const doc = await prisma.knowledgeDocument.findFirst({
      where: { id, doctorId: doctor.id },
      select: { storagePath: true },
    })
    if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

    const admin = createAdminClient()
    await admin.storage.from(BUCKET).remove([doc.storagePath])
    await prisma.knowledgeDocument.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/knowledge:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
