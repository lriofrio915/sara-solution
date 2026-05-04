import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

async function getDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.doctor.findFirst({
    where: { OR: [{ id: user.id }, { email: user.email! }] },
    select: { id: true },
  })
}

export async function POST(req: Request) {
  const doctor = await getDoctor()
  if (!doctor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

  const MAX_SIZE = 500 * 1024 * 1024 // 500 MB
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Máximo 500 MB por video' }, { status: 400 })

  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/avi']
  const allowedExts = /\.(mp4|mov|webm|avi|m4v)$/i
  if (!allowedTypes.includes(file.type) && !allowedExts.test(file.name)) {
    return NextResponse.json({ error: 'Solo se permiten videos MP4, MOV, WebM o AVI' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  const storagePath = `videos/${doctor.id}/${Date.now()}.${ext}`

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await adminClient.storage
    .from('brand-images')
    .upload(storagePath, Buffer.from(arrayBuffer), {
      contentType: file.type || 'video/mp4',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = adminClient.storage
    .from('brand-images')
    .getPublicUrl(storagePath)

  return NextResponse.json({ url: publicUrl, name: file.name, size: file.size })
}
