'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, TrendingUp, Gift } from 'lucide-react'

const tabs = [
  { href: '/admin/doctors', label: 'Médicos', icon: Users },
  { href: '/admin/leads', label: 'Leads', icon: TrendingUp },
  { href: '/admin/referidos', label: 'Referidos', icon: Gift },
]

export default function AdminTabNav() {
  const pathname = usePathname()

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <nav className="flex justify-center gap-0.5 px-3 sm:px-6 overflow-x-auto scrollbar-none" aria-label="Admin tabs">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap flex-shrink-0 ${
                active
                  ? 'border-primary text-primary dark:text-primary'
                  : 'border-transparent text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
