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

  const { filename, contentType } = await req.json()
  if (!filename) return NextResponse.json({ error: 'filename requerido' }, { status: 400 })

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp4'
  const storagePath = `videos/${doctor.id}/${Date.now()}.${ext}`

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await adminClient.storage
    .from('brand-images')
    .createSignedUploadUrl(storagePath)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Error generando URL' }, { status: 500 })
  }

  const publicUrl = adminClient.storage
    .from('brand-images')
    .getPublicUrl(storagePath).data.publicUrl

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: storagePath,
    publicUrl,
    contentType: contentType ?? 'video/mp4',
  })
}
