import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { validateP12, encryptPassword } from '@/lib/firma-ec'

export const dynamic = 'force-dynamic'

// ─── POST — Upload .p12 ───────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true },
    })
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    // Parse multipart/form-data
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
    }

    const file = formData.get('file')
    const password = formData.get('password')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file field' }, { status: 400 })
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Missing password field' }, { status: 400 })
    }

    // Validate file extension
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.p12') && !fileName.endsWith('.pfx')) {
      return NextResponse.json(
        { error: 'File must be a .p12 or .pfx file' },
        { status: 400 }
      )
    }

    // Validate file size (max 2 MB)
    const MAX_SIZE = 2 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds maximum size of 2 MB' },
        { status: 400 }
      )
    }

    // Read file as Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate the .p12 certificate
    const validation = validateP12(buffer, password)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error ?? 'Invalid .p12 file or incorrect password' },
        { status: 400 }
      )
    }

    // Encrypt the password
    const { iv, tag, encPass } = encryptPassword(password)

    // Upload to Supabase Storage (private bucket 'firma-ec')
    const timestamp = Date.now()
    const storagePath = `${doctor.id}/${timestamp}.p12`

    const adminClient = createAdminClient()
    const { error: uploadError } = await adminClient.storage
      .from('firma-ec')
      .upload(storagePath, buffer, {
        contentType: 'application/x-pkcs12',
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload signature file' },
        { status: 500 }
      )
    }

    // Update doctor record
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        signaturePath: storagePath,
        signatureIv: iv,
        signatureTag: tag,
        signatureEncPass: encPass,
      },
    })

    return NextResponse.json({
      success: true,
      subject: validation.subject,
      notAfter: validation.notAfter,
    })
  } catch (err) {
    console.error('POST /api/profile/signature:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── DELETE — Remove .p12 ─────────────────────────────────────────────────────

export async function DELETE() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: {
        id: true,
        signaturePath: true,
      },
    })
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    // Delete from Supabase Storage if a file exists
    if (doctor.signaturePath) {
      const adminClient = createAdminClient()
      const { error: removeError } = await adminClient.storage
        .from('firma-ec')
        .remove([doctor.signaturePath])

      if (removeError) {
        console.error('Supabase storage remove error:', removeError)
        // Continue anyway — clear DB record regardless of storage result
      }
    }

    // Clear all signature fields
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        signaturePath: null,
        signatureIv: null,
        signatureTag: null,
        signatureEncPass: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/profile/signature:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── GET — Check signature status ─────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: {
        signaturePath: true,
        signatureIv: true,
        signatureTag: true,
        signatureEncPass: true,
      },
    })
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    if (!doctor.signaturePath) {
      return NextResponse.json({ configured: false })
    }

    // Check existence in storage without downloading the file
    const adminClient = createAdminClient()
    const { data: fileList, error: listError } = await adminClient.storage
      .from('firma-ec')
      .list(doctor.signaturePath.split('/').slice(0, -1).join('/'), {
        search: doctor.signaturePath.split('/').pop(),
      })

    const fileExists =
      !listError && Array.isArray(fileList) && fileList.length > 0

    return NextResponse.json({
      configured: true,
      path: fileExists,
    })
  } catch (err) {
    console.error('GET /api/profile/signature:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
