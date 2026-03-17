'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SaraLogo from '@/components/SaraLogo'
import LogoutButton from '@/components/LogoutButton'

const navItems = [
  { href: '/mi-salud', label: 'Inicio', icon: '🏠' },
  { href: '/mi-salud/citas', label: 'Citas', icon: '📅' },
  { href: '/mi-salud/recetas', label: 'Recetas', icon: '💊' },
  { href: '/mi-salud/examenes', label: 'Exámenes', icon: '🔬' },
  { href: '/mi-salud/certificados', label: 'Certificados', icon: '📋' },
  { href: '/mi-salud/perfil', label: 'Mi Perfil', icon: '👤' },
]

interface Props {
  patientName: string
  doctorName: string
  isAlsoDoctor?: boolean
}

export default function PatientPortalNav({ patientName, doctorName, isAlsoDoctor }: Props) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/mi-salud' ? pathname === href : pathname.startsWith(href)

  const firstName = patientName.split(' ')[0]

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <SaraLogo size="sm" />

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAlsoDoctor && (
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors"
              title="Ir a tu consultorio médico"
            >
              <span>🩺</span>
              <span>Mi consultorio</span>
            </Link>
          )}
          <span className="hidden sm:block text-xs text-gray-400 dark:text-slate-400">{firstName}</span>
          <LogoutButton />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex shadow-lg z-40">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              isActive(item.href)
                ? 'text-primary'
                : 'text-gray-400 dark:text-slate-400'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Doctor badge */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 border-b border-primary/10 dark:border-primary/20 px-4 py-1.5 text-center flex items-center justify-center gap-3">
        <p className="text-xs text-gray-500 dark:text-slate-300">
          Tu médico: <span className="font-semibold text-gray-700 dark:text-slate-300">{doctorName}</span>
        </p>
        {isAlsoDoctor && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-semibold uppercase tracking-wide">
            🩺 También médico
          </span>
        )}
      </div>
    </header>
  )
}
