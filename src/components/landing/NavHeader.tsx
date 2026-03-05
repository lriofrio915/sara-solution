'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function NavHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
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
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="saraGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563EB"/>
                <stop offset="100%" stopColor="#0D9488"/>
              </linearGradient>
            </defs>
            {/* Fondo redondeado */}
            <rect width="36" height="36" rx="10" fill="url(#saraGrad)"/>
            {/* Cruz médica sutil */}
            <rect x="16.5" y="9" width="3" height="18" rx="1.5" fill="white" fillOpacity="0.2"/>
            <rect x="9" y="16.5" width="18" height="3" rx="1.5" fill="white" fillOpacity="0.2"/>
            {/* Letra S */}
            <path
              d="M22 13.5C22 13.5 20.5 11.5 18 11.5C15.2 11.5 13.5 13 13.5 15C13.5 17 15 17.8 18 18.5C21 19.2 22.5 20.2 22.5 22.2C22.5 24.2 20.8 25.5 18 25.5C15.2 25.5 13.5 23.5 13.5 23.5"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <span className={`font-bold text-lg tracking-tight ${scrolled ? 'text-gray-900' : 'text-white'}`}>
            Sara<span className={`font-light ${scrolled ? 'text-gray-400' : 'text-white/70'}`}> Solution</span>
          </span>
        </Link>

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
              <Link href="/login" className="text-center text-gray-600 font-medium py-3 rounded-xl border border-gray-200">
                Iniciar sesión
              </Link>
              <Link href="/register" className="text-center text-white font-semibold py-3 rounded-xl bg-primary hover:bg-primary-dark transition-colors">
                Comienza gratis
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
