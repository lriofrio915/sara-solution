import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDoctorByAuthId } from '@/lib/queries'
import { prisma } from '@/lib/prisma'

const BUCKET = 'knowledge'
const MAX_TEXT_LENGTH = 100_000 // chars — reasonable limit for DB storage

// ─── GET /api/knowledge ───────────────────────────────────────────────────────
// Returns list of knowledge documents for the authenticated doctor

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const doctor = await getDoctorByAuthId(user.id)
  if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })

  const docs = await prisma.knowledgeDocument.findMany({
    where: { doctorId: doctor.id },
    select: { id: true, name: true, size: true, mimeType: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ documents: docs })
}

// ─── POST /api/knowledge ──────────────────────────────────────────────────────
// Uploads a file to Supabase Storage and saves metadata + extracted text to DB

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const doctor = await getDoctorByAuthId(user.id)
  if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const textContent = formData.get('textContent') as string | null

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

  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo no puede superar 10 MB' }, { status: 400 })
  }

  // Upload to Supabase Storage using admin client
  const admin = createAdminClient()
  const storagePath = `${doctor.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Error al subir el archivo al almacenamiento' }, { status: 500 })
  }

  // Save metadata + text content to DB
  const extractedText = textContent
    ? textContent.slice(0, MAX_TEXT_LENGTH)
    : `[Archivo: ${file.name}] (sin texto extraído)`

  const doc = await prisma.knowledgeDocument.create({
    data: {
      doctorId: doctor.id,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      storagePath,
      textContent: extractedText,
    },
    select: { id: true, name: true, size: true, mimeType: true, createdAt: true },
  })

  return NextResponse.json({ document: doc }, { status: 201 })
}

// ─── DELETE /api/knowledge?id=xxx ─────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const doctor = await getDoctorByAuthId(user.id)
  if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const doc = await prisma.knowledgeDocument.findUnique({
    where: { id, doctorId: doctor.id },
    select: { storagePath: true },
  })

  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  // Delete from storage
  const admin = createAdminClient()
  await admin.storage.from(BUCKET).remove([doc.storagePath])

  // Delete from DB
  await prisma.knowledgeDocument.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
