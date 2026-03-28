import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDoctorFromUser, getAssistantDoctors } from '@/lib/doctor-auth'
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

    // Read the active doctor cookie (set by /api/assistant/switch-doctor)
    const cookieStore = await cookies()
    const activeDoctorId = cookieStore.get('sara-active-doctor-id')?.value ?? null

    const doctorWithRole = await getDoctorFromUser(user, activeDoctorId)

    // null means either: not a doctor/assistant, OR multi-doctor assistant without selection
    if (!doctorWithRole) redirect('/select-doctor')

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
      displayName = nameParts.map(toTitle).slice(0, 2).join(' ')
    } else if (isSuperAdmin) {
      // Superadmin: show plain name without medical title prefix
      displayName = nameParts.map(toTitle).slice(0, 2).join(' ')
    } else {
      const title = (doctorProfile as { titlePrefix?: string | null })?.titlePrefix || detectDoctorTitle(nameParts[0])
      displayName = `${title} ${toTitle(nameParts[0])}${nameParts[1] ? ' ' + toTitle(nameParts[1]) : ''}`
    }

    const effectivePlan = getEffectivePlan(doctorWithRole)
    const trialDaysLeft = getTrialDaysLeft(doctorWithRole.trialEndsAt)

    // Assistant sidebar: use own name + avatar, and load all accessible doctors for switcher
    let sidebarName = displayName
    let sidebarAvatarUrl: string | null = (doctorProfile as { avatarUrl?: string | null })?.avatarUrl ?? null
    let assistantDoctors = null

    if (doctorWithRole.role === 'ASSISTANT') {
      const member = await prisma.doctorMember.findFirst({
        where: { authId: user.id, doctorId: doctorWithRole.id },
        select: { name: true, avatarUrl: true },
      })
      if (member) {
        sidebarName = member.name.trim().split(/\s+/).map(toTitle).slice(0, 2).join(' ')
        sidebarAvatarUrl = member.avatarUrl
      }

      // Load switcher doctors only if there are multiple
      const allDoctors = await getAssistantDoctors(user.id)
      if (allDoctors.length > 1) {
        assistantDoctors = allDoctors
      }
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
          activeDoctorId={doctorWithRole.id}
          assistantDoctors={assistantDoctors}
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
