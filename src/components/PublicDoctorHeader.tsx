'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Props {
  slug: string
  displayName: string
  specialty: string
  avatarUrl: string | null
  initials: string
}

export default function PublicDoctorHeader({ slug, displayName, specialty, avatarUrl, initials }: Props) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800 py-2'
          : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm py-3'
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
            >
              {initials}
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{displayName}</p>
            <p className="text-blue-600 text-xs font-medium">{specialty}</p>
          </div>
        </div>

        <Link
          href={`/${slug}/chat`}
          className="flex items-center gap-1.5 text-white font-semibold px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm shadow-md hover:opacity-90 transition-all hover:-translate-y-0.5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
        >
          <span>📅</span>
          <span className="hidden sm:inline">Reservar cita</span>
          <span className="sm:hidden">Cita</span>
        </Link>
      </div>
    </header>
  )
}
