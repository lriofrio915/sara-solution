'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import SaraLogo from '@/components/SaraLogo'
import LogoutButton from '@/components/LogoutButton'
import DarkModeToggle from '@/components/DarkModeToggle'

const navItems = [
  { href: '/dashboard',    icon: '📊', label: 'Dashboard' },
  { href: '/patients',     icon: '👥', label: 'Pacientes' },
  { href: '/appointments', icon: '📅', label: 'Citas' },
  { href: '/prescriptions',icon: '💊', label: 'Recetario' },
  { href: '/exam-orders',  icon: '🔬', label: 'Órdenes' },
  { href: '/certificates', icon: '📋', label: 'Certificados' },
  { href: '/reminders',    icon: '🔔', label: 'Recordatorios' },
  { href: '/marketing',    icon: '📱', label: 'Marketing' },
  { href: '/sara',         icon: '✨', label: 'Sara IA' },
  { href: '/knowledge',    icon: '📚', label: 'Conocimiento' },
  { href: '/profile',      icon: '👤', label: 'Mi Perfil' },
]

// Ítems que aparecen en el bottom tab bar (mobile)
const tabItems = navItems.slice(0, 5)

interface Props {
  firstName: string
  specialty: string
  initials: string
  avatarUrl: string | null
}

export default function DoctorSidebar({ firstName, specialty, initials, avatarUrl }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar drawer al cambiar de ruta
  useEffect(() => { setOpen(false) }, [pathname])

  // Evitar scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const avatarEl = avatarUrl ? (
    <Image src={avatarUrl} alt={firstName} width={36} height={36}
      className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
      {initials}
    </div>
  )

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shadow-sm flex-col flex-shrink-0 h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <SaraLogo size="sm" />
            <DarkModeToggle />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10'
              }`}>
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <Link href="/sara"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm hover:opacity-90 transition-opacity">
            <span className="text-lg">✨</span>
            Hablar con Sara
          </Link>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {avatarEl}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{firstName}</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs truncate">{specialty}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-4 shadow-sm">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú"
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <SaraLogo size="sm" />

        <div className="flex items-center gap-2">
          <DarkModeToggle />
          {avatarEl}
        </div>
      </header>

      {/* ── MOBILE DRAWER BACKDROP ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)} />
      )}

      {/* ── MOBILE DRAWER ── */}
      <div className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-gray-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header drawer */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <SaraLogo size="sm" />
          <button onClick={() => setOpen(false)} aria-label="Cerrar menú"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav drawer */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-sm transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Sara CTA */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <Link href="/sara"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm hover:opacity-90 transition-opacity">
            <span className="text-lg">✨</span>
            Hablar con Sara
          </Link>
        </div>

        {/* User + logout */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {avatarEl}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{firstName}</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs truncate">{specialty}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex shadow-lg">
        {tabItems.map((item) => (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              isActive(item.href)
                ? 'text-primary'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}>
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
