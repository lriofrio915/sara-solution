import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BUCKET = 'doctor-credentials'
const MAX_SIZE = 15 * 1024 * 1024 // 15 MB

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

// ── GET /api/profile/credentials ─────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await prisma.doctor.findUnique({ where: { authId: user.id } })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  const credentials = await prisma.doctorCredential.findMany({
    where: { doctorId: doctor.id },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ credentials })
}

// ── POST /api/profile/credentials ────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await prisma.doctor.findUnique({ where: { authId: user.id } })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null
  const title = formData.get('title') as string | null
  const institution = formData.get('institution') as string | null
  const yearRaw = formData.get('year') as string | null

  if (!file || !type || !title) {
    return NextResponse.json({ error: 'Archivo, tipo y título son requeridos' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten PDF e imágenes (JPG, PNG, WebP)' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo no debe superar 15 MB' }, { status: 400 })
  }

  const validTypes = ['SENESCYT', 'TITULO_TERCER', 'TITULO_CUARTO', 'CERTIFICADO', 'CURSO', 'SEMINARIO']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Tipo de credencial inválido' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60)
  const storagePath = `${doctor.id}/${Date.now()}-${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Error al subir archivo: ${uploadError.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(storagePath)

  const credential = await prisma.doctorCredential.create({
    data: {
      doctorId: doctor.id,
      type: type as any,
      title: title.trim(),
      institution: institution?.trim() || null,
      year: yearRaw ? parseInt(yearRaw) : null,
      storagePath,
      fileUrl: publicUrl,
      mimeType: file.type,
      fileSize: file.size,
    },
  })

  return NextResponse.json({ credential }, { status: 201 })
}

// ── DELETE /api/profile/credentials?id=xxx ───────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await prisma.doctor.findUnique({ where: { authId: user.id } })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const credential = await prisma.doctorCredential.findFirst({
    where: { id, doctorId: doctor.id },
  })
  if (!credential) return NextResponse.json({ error: 'Credencial no encontrada' }, { status: 404 })

  const admin = createAdminClient()
  await admin.storage.from(BUCKET).remove([credential.storagePath])
  await prisma.doctorCredential.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
