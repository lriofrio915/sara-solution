import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: {
        id: true,
        slug: true,
        name: true,
        specialty: true,
        email: true,
        phone: true,
        bio: true,
        avatarUrl: true,
        address: true,
        whatsapp: true,
        webhookUrl: true,
        branches: true,
        schedules: true,
        services: true,
        cedulaId: true,
        mspCode: true,
        specialtyRegCode: true,
        establishmentName: true,
        establishmentCode: true,
        establishmentRuc: true,
        province: true,
        canton: true,
        parish: true,
        consultationModes: true,
        paymentData: true,
      },
    })

    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    return NextResponse.json(doctor)
  } catch (err) {
    console.error('GET /api/profile:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, specialty, phone, bio, avatarUrl, address, whatsapp, webhookUrl, branches, schedules, services, slug, cedulaId, mspCode, specialtyRegCode, establishmentName, establishmentCode, establishmentRuc, province, canton, parish, consultationModes, paymentData } = body

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
    })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    if (slug !== undefined) {
      const clean = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '')
      if (!clean || clean.length < 3) {
        return NextResponse.json({ error: 'El nombre de página debe tener al menos 3 caracteres (letras, números y guiones)' }, { status: 400 })
      }
      const existing = await prisma.doctor.findFirst({ where: { slug: clean, NOT: { id: doctor.id } } })
      if (existing) {
        return NextResponse.json({ error: 'Ese nombre de página ya está en uso, elige otro' }, { status: 409 })
      }
    }

    const updated = await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(specialty !== undefined && { specialty: String(specialty).trim() }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
        ...(address !== undefined && { address: address || null }),
        ...(whatsapp !== undefined && { whatsapp: whatsapp || null }),
        ...(webhookUrl !== undefined && { webhookUrl: webhookUrl || null }),
        ...(branches !== undefined && { branches: branches || null }),
        ...(schedules !== undefined && { schedules: schedules || null }),
        ...(services !== undefined && { services: services || null }),
        ...(slug !== undefined && { slug: String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '') }),
        ...(cedulaId !== undefined && { cedulaId: cedulaId || null }),
        ...(mspCode !== undefined && { mspCode: mspCode || null }),
        ...(specialtyRegCode !== undefined && { specialtyRegCode: specialtyRegCode || null }),
        ...(establishmentName !== undefined && { establishmentName: establishmentName || null }),
        ...(establishmentCode !== undefined && { establishmentCode: establishmentCode || null }),
        ...(establishmentRuc !== undefined && { establishmentRuc: establishmentRuc || null }),
        ...(province !== undefined && { province: province || null }),
        ...(canton !== undefined && { canton: canton || null }),
        ...(parish !== undefined && { parish: parish || null }),
        ...(consultationModes !== undefined && { consultationModes: consultationModes || null }),
        ...(paymentData !== undefined && { paymentData: paymentData || null }),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        specialty: true,
        email: true,
        phone: true,
        bio: true,
        avatarUrl: true,
        address: true,
        whatsapp: true,
        webhookUrl: true,
        branches: true,
        schedules: true,
        services: true,
        cedulaId: true,
        mspCode: true,
        specialtyRegCode: true,
        establishmentName: true,
        establishmentCode: true,
        establishmentRuc: true,
        province: true,
        canton: true,
        parish: true,
        consultationModes: true,
        paymentData: true,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/profile:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true },
    })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    // Delete DB record first (cascades all related data)
    await prisma.doctor.delete({ where: { id: doctor.id } })

    // Then delete Supabase auth user
    const admin = createAdminClient()
    await admin.auth.admin.deleteUser(user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/profile:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
