import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { buildMetadata, NOINDEX } from '@/lib/seo'
import { prisma } from '@/lib/prisma'
import DoctorChatUI from '@/components/public/DoctorChatUI'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const doctor = await prisma.doctor.findUnique({
    where: { slug: params.slug },
    select: { name: true, specialty: true },
  })
  if (!doctor) return { title: 'Chat no disponible', ...NOINDEX }
  return buildMetadata({
    title: `Chat con Sara — Asistente de ${doctor.name}`,
    description: `Agenda tu cita con ${doctor.name} a través de Sara, la asistente médico IA.`,
    path: `/${params.slug}/chat`,
  })
}

export default async function DoctorChatPage(props: Props) {
  const params = await props.params;
  const doctor = await prisma.doctor.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      name: true,
      specialty: true,
      avatarUrl: true,
      slug: true,
    },
  })

  if (!doctor) notFound()

  return (
    <DoctorChatUI
      doctor={{
        name: doctor.name,
        specialty: doctor.specialty,
        avatarUrl: doctor.avatarUrl,
        slug: doctor.slug,
      }}
    />
  )
}
