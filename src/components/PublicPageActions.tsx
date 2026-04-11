'use client'

import { useState, useEffect } from 'react'

export default function PublicPageActions() {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))

    const onScroll = () => {
      const scrolled = window.scrollY
      const total = document.documentElement.scrollHeight - window.innerHeight
      setShowScrollTop(total > 0 && scrolled >= total - 80)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const scrollToTop = () => {
    const startY = window.scrollY
    if (startY === 0) return
    const duration = 600
    const start = performance.now()
    const step = (timestamp: number) => {
      const elapsed = timestamp - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      window.scrollTo(0, Math.round(startY * (1 - ease)))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  return (
    <>
      {/* Dark / Light mode toggle — bottom left */}
      <button
        onClick={toggleDark}
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className="fixed bottom-20 left-6 md:bottom-6 z-50 flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-2 shadow-lg hover:scale-105 transition-all duration-200"
      >
        <span className="text-base leading-none">{isDark ? '☀️' : '🌙'}</span>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 select-none">
          {isDark ? 'Claro' : 'Oscuro'}
        </span>
      </button>

      {/* Scroll to top — bottom right, above WhatsApp button */}
      <button
        onClick={scrollToTop}
        aria-label="Volver al inicio"
        className={`fixed bottom-24 right-6 z-50 w-12 h-12 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:scale-110 transition-all duration-300 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </>
  )
}
