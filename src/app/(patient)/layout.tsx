import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import PatientPortalNav from '@/components/PatientPortalNav'

export const dynamic = 'force-dynamic'

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')

    const role = user.user_metadata?.role

    // Find patient record linked to this auth account
    const patient = await prisma.patient.findFirst({
      where: { authId: user.id },
      include: { doctor: { select: { name: true, specialty: true, avatarUrl: true } } },
    })

    // Doctor with no patient record → redirect to dashboard
    if (role === 'doctor' && !patient) redirect('/dashboard')
    if (!patient) redirect('/login')

    // Check if this patient is also a registered doctor (dual role)
    const doctorRecord = await prisma.doctor.findFirst({
      where: { OR: [{ authId: user.id }, { email: user.email ?? '' }] },
      select: { id: true },
    })
    const isAlsoDoctor = !!doctorRecord

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PatientPortalNav
          patientName={patient.name}
          doctorName={patient.doctor.name}
          isAlsoDoctor={isAlsoDoctor}
        />
        <main className="max-w-3xl mx-auto px-4 pt-20 pb-8">
          {children}
        </main>
      </div>
    )
  } catch {
    redirect('/login')
  }
}
