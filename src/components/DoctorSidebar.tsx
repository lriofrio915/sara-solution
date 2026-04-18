'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Calendar, Users, Pill, FlaskConical, FileText,
  BarChart2, Megaphone, ShieldCheck,
  User, Bell, AlarmClock, BookOpen, Receipt, UserPlus, Gift, UsersRound, ClipboardList,
  ChevronsUpDown, Plug,
} from 'lucide-react'
import SaraLogo from '@/components/SaraLogo'
import DarkModeToggle from '@/components/DarkModeToggle'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import type { EffectivePlan } from '@/lib/plan'
import type { AssistantDoctor } from '@/lib/doctor-auth'

// ─── Nav groups ────────────────────────────────────────────────

// Items bloqueados para plan FREE
const FREE_LOCKED = new Set([
  '/appointments',
  '/leads',
  '/marketing',
  '/reminders',
  '/billing',
  '/team',
  '/knowledge',
])

// Resumen IA va primero — visión general + análisis de la clínica
const topItem = { href: '/dashboard', icon: BarChart2, label: 'Resumen IA' }

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
  { href: '/reminders',  icon: AlarmClock,  label: 'Recordatorios' },
  { href: '/billing',    icon: Receipt,     label: 'Facturación' },
]

// Item exclusivo para ASSISTANT — aparece primero en la navegación
const receptionItem = { href: '/reception', icon: ClipboardList, label: 'Recepción' }

// Mobile bottom tab bar: Reportes + primeros 4 clínicos (para OWNER)
// Para ASSISTANT: Recepción + primeros 4 clínicos
const tabItems = [topItem, ...clinicalItems.slice(0, 4)]
const assistantTabItems = [receptionItem, ...clinicalItems.slice(0, 4)]

const gearItems = [
  { href: '/profile',       icon: User,       label: 'Mi Perfil' },
  { href: '/team',          icon: UsersRound, label: 'Equipo' },
  { href: '/referidos',     icon: Gift,       label: 'Referidos' },
  { href: '/knowledge',     icon: BookOpen,   label: 'Base de Conocimiento' },
  { href: '/integraciones', icon: Plug,       label: 'Integraciones' },
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
  activeDoctorId?: string
  assistantDoctors?: AssistantDoctor[] | null
}

export default function DoctorSidebar({ firstName, specialty, initials, avatarUrl, isSuperAdmin, plan, trialDaysLeft, role = 'OWNER', activeDoctorId, assistantDoctors }: Props) {
  const [open, setOpen] = useState(false)
  const [gearOpen, setGearOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [notifItems, setNotifItems] = useState<{ type: string; label: string; href: string; createdAt?: string }[]>([])
  const pathname = usePathname()
  const router = useRouter()
  const gearRef = useRef<HTMLDivElement>(null)
  const switcherRef = useRef<HTMLDivElement>(null)

  // Close drawer on route change
  useEffect(() => { setOpen(false); setGearOpen(false); setSwitcherOpen(false) }, [pathname])

  // Close gear/bell menus on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
        setGearOpen(false)
      }
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
      if (!(e.target as Element).closest?.('[data-bell]')) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch notification count on mount + poll every 60s
  useEffect(() => {
    function fetchNotifs() {
      fetch('/api/notifications/count')
        .then(r => r.json())
        .then(d => {
          if (d?.count !== undefined) setNotifCount(d.count)
          if (d?.items) setNotifItems(d.items)
        })
        .catch(() => {})
    }
    fetchNotifs()
    const timer = setInterval(fetchNotifs, 60000)
    return () => clearInterval(timer)
  }, [])

  async function handleSwitchDoctor(doctorId: string) {
    if (doctorId === activeDoctorId || switching) return
    setSwitching(true)
    setSwitcherOpen(false)
    try {
      await fetch('/api/assistant/switch-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId }),
      })
      router.refresh()
    } finally {
      setSwitching(false)
    }
  }

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

  const BellBadge = () => (
    <div data-bell="" className="relative">
      <button
        onClick={() => setBellOpen(prev => !prev)}
        className="relative p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {notifCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none">
            {notifCount > 99 ? '99+' : notifCount}
          </span>
        )}
      </button>
      {bellOpen && (
        <div className="fixed left-2 right-2 top-16 z-50 md:absolute md:left-0 md:right-auto md:w-80 md:top-10 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 overflow-hidden">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-2">Notificaciones</p>
          {notifItems.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 px-4 py-3">Sin notificaciones pendientes</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifItems.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  onClick={() => {
                    setNotifItems(prev => prev.filter((_, idx) => idx !== i))
                    setNotifCount(prev => Math.max(0, prev - 1))
                    setBellOpen(false)
                  }}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <span className="mt-0.5 text-base flex-shrink-0">
                    {item.type === 'appointment' ? '📅' : item.type === 'reminder' ? '⏰' : item.type === 'credit_approved' ? '✅' : item.type === 'credit_recharge' ? '💳' : '💬'}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{item.label}</span>
                    {item.createdAt && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {new Date(item.createdAt).toLocaleString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

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
  }) => {
    const locked = plan === 'FREE' && FREE_LOCKED.has(href)
    return (
      <Link href={href}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${extraClass} ${
          isActive(href)
            ? 'bg-primary/10 text-primary dark:bg-primary/20'
            : locked
              ? 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              : 'text-gray-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10'
        }`}>
        <Icon size={18} className="flex-shrink-0" />
        <span className="flex-1">{label}</span>
        {locked && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-gray-400 dark:text-slate-500">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        )}
      </Link>
    )
  }

  // ── Doctor Switcher (multi-doctor assistants only) ───────────
  const DoctorSwitcher = () => {
    if (!assistantDoctors || assistantDoctors.length < 2) return null
    const activeDoc = assistantDoctors.find(d => d.doctorId === activeDoctorId)
    return (
      <div ref={switcherRef} className="relative mb-3">
        <button
          onClick={() => setSwitcherOpen(v => !v)}
          disabled={switching}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors disabled:opacity-60"
        >
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500 dark:text-violet-400">
              Consultorio activo
            </p>
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 truncate">
              {switching ? 'Cambiando...' : (activeDoc?.doctorName ?? 'Seleccionar')}
            </p>
          </div>
          <ChevronsUpDown size={14} className="flex-shrink-0 text-violet-400" />
        </button>

        {switcherOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 max-h-64 overflow-y-auto">
            <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Cambiar consultorio
            </p>
            {assistantDoctors.map(doc => {
              const isActive = doc.doctorId === activeDoctorId
              const docInitials = getInitials(doc.doctorName)
              return (
                <button
                  key={doc.doctorId}
                  onClick={() => handleSwitchDoctor(doc.doctorId)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isActive
                      ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {doc.avatarUrl ? (
                    <Image src={doc.avatarUrl} alt={doc.doctorName} width={28} height={28} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                      {docInitials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{doc.doctorName}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">{doc.specialty}</p>
                  </div>
                  {isActive && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-violet-500">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

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
          {gearItems.map(({ href, icon: Icon, label }) => {
            const locked = plan === 'FREE' && FREE_LOCKED.has(href)
            return (
            <Link
              key={href}
              href={href}
              onClick={() => setGearOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive(href)
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : locked
                    ? 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {locked && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-gray-400 dark:text-slate-500">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              )}
            </Link>
          )})}

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
    <nav className={`flex-1 min-h-0 overflow-y-auto ${mobile ? 'p-4' : 'p-4'}`}>
      {/* Recepción — solo visible para ASSISTANT, va primero */}
      {role === 'ASSISTANT' && (
        <>
          <div className="space-y-1 mb-1">
            <NavLink {...receptionItem} />
          </div>
          <hr className="border-gray-100 dark:border-gray-700 my-2" />
        </>
      )}

      {/* Resumen IA — visión general (solo OWNER) */}
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
          {gearItems.map(({ href, icon: Icon, label }) => {
            const locked = plan === 'FREE' && FREE_LOCKED.has(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-sm transition-colors ${
                  isActive(href)
                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                    : locked
                      ? 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      : 'text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}>
                <Icon size={18} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {locked && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-gray-400 dark:text-slate-500">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 shadow-sm flex-col flex-shrink-0 h-[100dvh] sticky top-0">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <SaraLogo size="sm" />
            <div className="flex items-center gap-1">
              <BellBadge />
              <DarkModeToggle />
            </div>
          </div>
        </div>

        <NavContent />

        {/* Bottom: doctor switcher + plan badge + avatar + gear */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {/* Doctor switcher — multi-doctor assistants only */}
          <DoctorSwitcher />

          {/* Plan badge */}
          {plan && plan !== 'PRO_MENSUAL' && plan !== 'PRO_ANUAL' && plan !== 'ENTERPRISE' && (
            <Link href="/upgrade" className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {plan === 'TRIAL'
                  ? (trialDaysLeft && trialDaysLeft > 0 ? `🎁 Trial — ${trialDaysLeft}d restantes` : '⚠️ Trial vencido')
                  : '🔒 Plan Free'}
              </span>
              <span className="text-xs font-bold text-primary">Upgrade →</span>
            </Link>
          )}
          {(plan === 'PRO_MENSUAL' || plan === 'PRO_ANUAL' || plan === 'ENTERPRISE') && (
            <div className="flex items-center px-3 py-2 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
              <span className="text-xs font-semibold text-primary">
                ⭐ {plan === 'ENTERPRISE' ? 'Plan Enterprise' : plan === 'PRO_ANUAL' ? 'Pro Anual' : 'Pro Mensual'}
              </span>
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
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <SaraLogo size="sm" />

        <div className="flex items-center gap-2">
          <BellBadge />
          <DarkModeToggle />
          <Link href="/profile" aria-label="Mi perfil">
            <AvatarEl size={9} />
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="p-2 rounded-xl text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors touch-manipulation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── MOBILE DRAWER BACKDROP ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)} />
      )}

      {/* ── MOBILE DRAWER ── */}
      <div className={`md:hidden fixed top-0 left-0 z-50 h-[100dvh] w-72 bg-white dark:bg-gray-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <SaraLogo size="sm" />
          <button onClick={() => setOpen(false)} aria-label="Cerrar menú"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <NavContent mobile />

        {/* Doctor switcher — mobile drawer */}
        {assistantDoctors && assistantDoctors.length > 1 && (
          <div className="px-4 pb-2">
            <DoctorSwitcher />
          </div>
        )}

        {/* User + logout */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-700">
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
        {(role === 'ASSISTANT' ? assistantTabItems : tabItems).map(({ href, icon: Icon, label }) => {
          const locked = plan === 'FREE' && FREE_LOCKED.has(href)
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                isActive(href)
                  ? 'text-primary'
                  : locked
                    ? 'text-gray-300 dark:text-slate-600'
                    : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300'
              }`}>
              <div className="relative">
                <Icon size={20} />
                {locked && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute -top-1 -right-1 text-gray-400 dark:text-slate-500 bg-white dark:bg-gray-800 rounded-full">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                )}
              </div>
              <span className="text-[10px] mt-0.5">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
