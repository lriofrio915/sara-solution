'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

const tabs = [
  {
    href: '/marketing/branding',
    label: 'Marca',
    icon: (active: boolean) => <span className={`text-base ${active ? 'text-primary' : 'text-gray-400'}`}>🎨</span>,
  },
  {
    href: '/marketing/instagram',
    label: 'Instagram',
    icon: (active: boolean) => (
      <InstagramIcon className={`w-4 h-4 ${active ? 'text-pink-500' : 'text-gray-400'}`} />
    ),
  },
  {
    href: '/marketing/facebook',
    label: 'Facebook',
    icon: (active: boolean) => (
      <FacebookIcon className={`w-4 h-4 ${active ? 'text-blue-500' : 'text-gray-400'}`} />
    ),
  },
  {
    href: '/marketing/tiktok',
    label: 'TikTok',
    icon: (active: boolean) => (
      <TikTokIcon className={`w-4 h-4 ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} />
    ),
  },
  {
    href: '/marketing/linkedin/trending',
    label: 'LinkedIn',
    icon: (active: boolean) => (
      <LinkedInIcon className={`w-4 h-4 ${active ? 'text-blue-700' : 'text-gray-400'}`} />
    ),
  },
  {
    href: '/marketing/autopilot',
    label: 'Planificador',
    icon: (active: boolean) => <span className={`text-base ${active ? 'text-primary' : 'text-gray-400'}`}>📅</span>,
  },
  {
    href: '/marketing/library',
    label: 'Biblioteca',
    icon: (active: boolean) => <span className={`text-base ${active ? 'text-primary' : 'text-gray-400'}`}>📚</span>,
  },
]

export default function MarketingNav() {
  const pathname = usePathname()
  return (
    <div className="px-6 md:px-8 pt-6 pb-0">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Marketing / Redes Sociales</h1>
      <p className="text-gray-500 dark:text-slate-300 text-sm mb-4">Crea y gestiona contenido para tus redes con IA</p>
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(tab => {
          const active = pathname === tab.href
            || pathname.startsWith(tab.href + '/')
            || (tab.href.includes('/linkedin') && pathname.startsWith('/marketing/linkedin'))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.icon(active)}
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
