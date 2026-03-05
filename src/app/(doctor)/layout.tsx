import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import LogoutButton from '@/components/LogoutButton'
import DarkModeToggle from '@/components/DarkModeToggle'
import SaraLogo from '@/components/SaraLogo'
import { getInitials } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/patients', icon: '👥', label: 'Pacientes' },
  { href: '/appointments', icon: '📅', label: 'Citas' },
  { href: '/sara', icon: '✨', label: 'Sara IA' },
  { href: '/knowledge', icon: '📚', label: 'Conocimiento' },
  { href: '/profile', icon: '👤', label: 'Mi Perfil' },
]

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      redirect('/login')
    }

    const doctor = await prisma.doctor.findFirst({
      where: {
        OR: [
          { id: user.id },
          { email: user.email! },
        ],
      },
    })

    if (!doctor) {
      redirect('/login')
    }

    const initials = getInitials(doctor.name)
    const firstName = doctor.name.split(' ')[0]

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
          {/* Logo + dark toggle */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3">
              <SaraLogo size="sm" />
              <DarkModeToggle />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors font-medium text-sm"
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Sara quick access */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <Link
              href="/sara"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <span className="text-lg">✨</span>
              Hablar con Sara
            </Link>
          </div>

          {/* User info + logout */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {doctor.avatarUrl ? (
                <Image
                  src={doctor.avatarUrl}
                  alt={firstName}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{firstName}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs truncate">{doctor.specialty}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    )
  } catch (error) {
    console.error('DoctorLayout error:', error)
    redirect('/login')
  }
}
