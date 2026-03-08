import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import DoctorSidebar from '@/components/DoctorSidebar'
import { getInitials } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect('/login')

    const doctor = await prisma.doctor.findFirst({
      where: { OR: [{ id: user.id }, { email: user.email! }] },
      select: { id: true, name: true, specialty: true, avatarUrl: true },
    })
    if (!doctor) redirect('/login')

    const nameParts = doctor.name.trim().split(/\s+/)
    const toTitle = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    const displayName = `Dra. ${toTitle(nameParts[0])}${nameParts[1] ? ' ' + toTitle(nameParts[1]) : ''}`

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 md:flex">
        <DoctorSidebar
          firstName={displayName}
          specialty={doctor.specialty}
          initials={getInitials(doctor.name)}
          avatarUrl={doctor.avatarUrl}
        />

        {/* Main content — en mobile: padding top (topbar) + bottom (tab bar) */}
        <main className="flex-1 overflow-auto pt-14 pb-20 md:pt-0 md:pb-0">
          {children}
        </main>
      </div>
    )
  } catch (error) {
    console.error('DoctorLayout error:', error)
    redirect('/login')
  }
}
