import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser } from '@/lib/doctor-auth'
import DoctorSidebar from '@/components/DoctorSidebar'
import SaraFAB from '@/components/SaraFAB'
import PlanBanner from '@/components/PlanBanner'
import { getInitials, detectDoctorTitle } from '@/lib/utils'
import { getEffectivePlan, getTrialDaysLeft } from '@/lib/plan'

export const dynamic = 'force-dynamic'

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect('/login')

    const doctorWithRole = await getDoctorFromUser(user)
    if (!doctorWithRole) redirect('/login')

    // For display purposes fetch avatar + titlePrefix (only available on Doctor model)
    const doctorProfile = doctorWithRole.role === 'OWNER'
      ? await prisma.doctor.findFirst({
          where: { id: doctorWithRole.id },
          select: { titlePrefix: true, avatarUrl: true },
        })
      : await prisma.doctorMember.findFirst({
          where: { authId: user.id },
          select: { name: true },
        }).then(() => ({ titlePrefix: null as string | null, avatarUrl: null as string | null }))

    const isSuperAdmin = user?.email === 'lriofrio915@gmail.com'

    const nameParts = doctorWithRole.name.trim().split(/\s+/)
    const toTitle = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

    let displayName: string
    if (doctorWithRole.role === 'ASSISTANT') {
      // For assistants use their own name without title prefix
      displayName = nameParts.map(toTitle).slice(0, 2).join(' ')
    } else {
      const title = (doctorProfile as { titlePrefix?: string | null })?.titlePrefix || detectDoctorTitle(nameParts[0])
      displayName = `${title} ${toTitle(nameParts[0])}${nameParts[1] ? ' ' + toTitle(nameParts[1]) : ''}`
    }

    const effectivePlan = getEffectivePlan(doctorWithRole)
    const trialDaysLeft = getTrialDaysLeft(doctorWithRole.trialEndsAt)

    // Assistant name for sidebar — if assistant, fetch their own name from DoctorMember
    let sidebarName = displayName
    let sidebarAvatarUrl: string | null = (doctorProfile as { avatarUrl?: string | null })?.avatarUrl ?? null
    if (doctorWithRole.role === 'ASSISTANT') {
      const member = await prisma.doctorMember.findFirst({
        where: { authId: user.id },
        select: { name: true },
      })
      if (member) sidebarName = member.name.trim().split(/\s+/).map(toTitle).slice(0, 2).join(' ')
    }

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 md:flex">
        <DoctorSidebar
          firstName={sidebarName}
          specialty={doctorWithRole.role === 'ASSISTANT' ? 'Asistente' : doctorWithRole.specialty}
          initials={getInitials(sidebarName)}
          avatarUrl={sidebarAvatarUrl}
          isSuperAdmin={isSuperAdmin}
          plan={effectivePlan}
          trialDaysLeft={trialDaysLeft}
          role={doctorWithRole.role}
        />

        {/* Main content — en mobile: padding top (topbar) + bottom (tab bar) */}
        <main className="flex-1 overflow-auto pt-14 pb-20 md:pt-0 md:pb-0">
          <PlanBanner plan={effectivePlan} trialEndsAt={doctorWithRole.trialEndsAt} />
          {children}
        </main>
        <SaraFAB />
      </div>
    )
  } catch (error) {
    console.error('DoctorLayout error:', error)
    redirect('/login')
  }
}
