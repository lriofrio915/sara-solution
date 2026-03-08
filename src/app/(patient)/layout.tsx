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

    // Only patients can access this layout
    if (user.user_metadata?.role !== 'patient') redirect('/dashboard')

    const patient = await prisma.patient.findUnique({
      where: { authId: user.id },
      include: { doctor: { select: { name: true, specialty: true, avatarUrl: true } } },
    })
    if (!patient) redirect('/login')

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PatientPortalNav patientName={patient.name} doctorName={patient.doctor.name} />
        <main className="max-w-3xl mx-auto px-4 pt-20 pb-8">
          {children}
        </main>
      </div>
    )
  } catch {
    redirect('/login')
  }
}
