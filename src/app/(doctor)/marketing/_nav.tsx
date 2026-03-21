'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/marketing/branding',  label: 'Branding',   icon: '🎨' },
  { href: '/marketing/generator', label: 'Generador',  icon: '✨' },
  { href: '/marketing/autopilot', label: 'Autopilot',  icon: '🚀' },
  { href: '/marketing/library',   label: 'Biblioteca', icon: '📚' },
]

export default function MarketingNav() {
  const pathname = usePathname()
  return (
    <div className="px-6 md:px-8 pt-6 pb-0">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Marketing / Redes Sociales</h1>
      <p className="text-gray-500 dark:text-slate-300 text-sm mb-4">Gestiona tu presencia digital con IA</p>
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
