'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Calendar, Users, Pill, FlaskConical, FileText,
  BarChart2, Megaphone, ShieldCheck,
  User, Bell, BookOpen, TrendingUp, Receipt, UserPlus, Gift, UsersRound, ClipboardList,
} from 'lucide-react'
import SaraLogo from '@/components/SaraLogo'
import DarkModeToggle from '@/components/DarkModeToggle'
import { createClient } from '@/lib/supabase/client'
import type { EffectivePlan } from '@/lib/plan'

// ─── Nav groups ────────────────────────────────────────────────

// Reportes va primero — visión general de la clínica
const topItem = { href: '/dashboard', icon: BarChart2, label: 'Reportes' }

const clinicalItems = [
  { href: '/appointments',  icon: Calendar,     label: 'Citas' },
  { href: '/patients',      icon: Users,        label: 'Pacientes' },
  { href: '/prescriptions', icon: Pill,         label: 'Recetario' },
  { href: '/exam-orders',   icon: FlaskConical, label: 'Órdenes' },
  { href: '/certificates',  icon: FileText,     label: 'Certificados' },
]

const adminItems = [
  { href: '/leads',      icon: UserPlus,    label: 'Leads' },
  { href: '/marketing',  icon: Megaphone,   label: 'Marketing' },
  { href: '/reminders',  icon: Bell,        label: 'Notificaciones' },
  { href: '/analytics',  icon: TrendingUp,  label: 'Análisis IA' },
  { href: '/billing',    icon: Receipt,     label: 'Facturación' },
]

// Item exclusivo para ASSISTANT — aparece primero en la navegación
const receptionItem = { href: '/reception', icon: ClipboardList, label: 'Recepción' }

// Mobile bottom tab bar: Reportes + primeros 4 clínicos (para OWNER)
// Para ASSISTANT: Recepción + primeros 4 clínicos
const tabItems = [topItem, ...clinicalItems.slice(0, 4)]
const assistantTabItems = [receptionItem, ...clinicalItems.slice(0, 4)]

const gearItems = [
  { href: '/profile',   icon: User,       label: 'Mi Perfil' },
  { href: '/team',      icon: UsersRound, label: 'Equipo' },
  { href: '/referidos', icon: Gift,       label: 'Referidos' },
  { href: '/knowledge', icon: BookOpen,   label: 'Base de Conocimiento' },
]

// ─── Props ─────────────────────────────────────────────────────

interface Props {
  firstName: string
  specialty: string
  initials: string
  avatarUrl: string | null
  isSuperAdmin?: boolean
  plan?: EffectivePlan
  trialDaysLeft?: number
  role?: 'OWNER' | 'ASSISTANT'
}

export default function DoctorSidebar({ firstName, specialty, initials, avatarUrl, isSuperAdmin, plan, trialDaysLeft, role = 'OWNER' }: Props) {
  const [open, setOpen] = useState(false)
  const [gearOpen, setGearOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const gearRef = useRef<HTMLDivElement>(null)

  // Close drawer on route change
  useEffect(() => { setOpen(false); setGearOpen(false) }, [pathname])

  // Close gear menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
        setGearOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const AvatarEl = ({ size = 9 }: { size?: number }) => {
    const cls = `w-${size} h-${size} rounded-full flex-shrink-0`
    return avatarUrl ? (
      <Image src={avatarUrl} alt={firstName} width={36} height={36}
        className={`${cls} object-cover`} />
    ) : (
      <div className={`${cls} bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm`}>
        {initials}
      </div>
    )
  }

  // ── Shared nav link ──────────────────────────────────────────
  const NavLink = ({ href, icon: Icon, label, extraClass = '' }: {
    href: string; icon: React.ElementType; label: string; extraClass?: string
  }) => (
    <Link href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${extraClass} ${
        isActive(href)
          ? 'bg-primary/10 text-primary dark:bg-primary/20'
          : 'text-gray-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10'
      }`}>
      <Icon size={18} className="flex-shrink-0" />
      {label}
    </Link>
  )

  // ── Gear menu ────────────────────────────────────────────────
  const GearMenu = () => (
    <div ref={gearRef} className="relative">
      <button
        onClick={() => setGearOpen(v => !v)}
        aria-label="Configuración"
        className={`p-2 rounded-xl transition-colors ${
          gearOpen
            ? 'bg-primary/10 text-primary dark:bg-primary/20'
            : 'text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-slate-300'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      </button>

      {gearOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50">
          {gearItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setGearOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive(href)
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <hr className="border-gray-100 dark:border-gray-700 my-1" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors w-full text-left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )

  // ── Shared nav content (used in both desktop sidebar and mobile drawer) ──────
  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={`flex-1 overflow-y-auto ${mobile ? 'p-4' : 'p-4'}`}>
      {/* Recepción — solo visible para ASSISTANT, va primero */}
      {role === 'ASSISTANT' && (
        <>
          <div className="space-y-1 mb-1">
            <NavLink {...receptionItem} />
          </div>
          <hr className="border-gray-100 dark:border-gray-700 my-2" />
        </>
      )}

      {/* Reportes — visión general (solo OWNER) */}
      {role !== 'ASSISTANT' && (
        <>
          <div className="space-y-1 mb-1">
            <NavLink {...topItem} />
          </div>
          <hr className="border-gray-100 dark:border-gray-700 my-2" />
        </>
      )}

      {/* Group 1 — Clinical */}
      <div className="space-y-1">
        {clinicalItems.map(item => (
          <NavLink key={item.href} {...item} />
        ))}
      </div>

      <hr className="border-gray-100 dark:border-gray-700 my-2" />

      {/* Group 2 — Administrative */}
      <div className="space-y-1">
        {adminItems.map(item => (
          <NavLink key={item.href} {...item} />
        ))}

        {isSuperAdmin && (
          <Link href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
              isActive('/admin')
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-300'
                : 'text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-300'
            }`}>
            <ShieldCheck size={18} className="flex-shrink-0" />
            Administración
          </Link>
        )}
      </div>

      {/* Extra gear items inline in mobile drawer */}
      {mobile && (
        <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-700 space-y-1">
          {gearItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-sm transition-colors ${
                isActive(href)
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
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

        <NavContent />

        {/* Bottom: plan badge + avatar + gear */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {/* Plan badge */}
          {plan && plan !== 'PRO' && plan !== 'ENTERPRISE' && (
            <Link href="/upgrade" className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {plan === 'TRIAL'
                  ? (trialDaysLeft && trialDaysLeft > 0 ? `🎁 Trial — ${trialDaysLeft}d restantes` : '⚠️ Trial vencido')
                  : '🔒 Plan Free'}
              </span>
              <span className="text-xs font-bold text-primary">Upgrade →</span>
            </Link>
          )}
          {(plan === 'PRO' || plan === 'ENTERPRISE') && (
            <div className="flex items-center px-3 py-2 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
              <span className="text-xs font-semibold text-primary">⭐ Plan {plan === 'ENTERPRISE' ? 'Enterprise' : 'Pro'}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex-shrink-0" aria-label="Mi perfil">
              <AvatarEl size={9} />
            </Link>
            <Link href="/profile" className="flex-1 min-w-0 group">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-primary transition-colors">{firstName}</p>
                {role === 'ASSISTANT' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex-shrink-0">
                    AST
                  </span>
                )}
              </div>
              <p className="text-gray-400 dark:text-slate-400 text-xs truncate">{specialty}</p>
            </Link>
            <GearMenu />
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
          <Link href="/profile" aria-label="Mi perfil">
            <AvatarEl size={9} />
          </Link>
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
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <SaraLogo size="sm" />
          <button onClick={() => setOpen(false)} aria-label="Cerrar menú"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <NavContent mobile />

        {/* User + logout */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Link href="/profile" onClick={() => setOpen(false)} aria-label="Mi perfil">
              <AvatarEl size={9} />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{firstName}</p>
              <p className="text-gray-400 dark:text-slate-400 text-xs truncate">{specialty}</p>
            </div>
            <button onClick={handleLogout} aria-label="Cerrar sesión"
              className="p-2 rounded-xl text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex shadow-lg">
        {(role === 'ASSISTANT' ? assistantTabItems : tabItems).map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              isActive(href)
                ? 'text-primary'
                : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300'
            }`}>
            <Icon size={20} />
            <span className="text-[10px] mt-0.5">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
