'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SaraLogo from '@/components/SaraLogo'
import { createClient } from '@/lib/supabase/client'

export default function NavHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Check if user has an active session
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const navLinks = [
    { href: '#features', label: 'Características' },
    { href: '#how', label: 'Cómo funciona' },
    { href: '#pricing', label: 'Precios' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 py-3' : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8">
        {/* Logo: blanco sobre hero oscuro, oscuro sobre navbar blanco al hacer scroll */}
        <SaraLogo dark={!scrolled} forceDark={scrolled} />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 flex-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                scrolled ? 'text-gray-600' : 'text-white/80'
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="text-sm font-semibold bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
            >
              Ir al panel
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/10 ${
                  scrolled ? 'text-gray-600 hover:bg-gray-50' : 'text-white/90'
                }`}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Comienza gratis
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className={`md:hidden p-2 rounded-lg ${scrolled ? 'text-gray-700' : 'text-white'}`}
          aria-label="Menú"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {mobileOpen ? (
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
                <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-xl">
          <nav className="max-w-6xl mx-auto px-4 py-5 flex flex-col gap-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="text-center text-white font-semibold py-3 rounded-xl bg-primary hover:bg-primary-dark transition-colors"
                >
                  Ir al panel →
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-center text-gray-600 font-medium py-3 rounded-xl border border-gray-200">
                    Iniciar sesión
                  </Link>
                  <Link href="/register" className="text-center text-white font-semibold py-3 rounded-xl bg-primary hover:bg-primary-dark transition-colors">
                    Comienza gratis
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
