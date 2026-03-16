'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, TrendingUp } from 'lucide-react'

const tabs = [
  { href: '/admin/doctors', label: 'Médicos', icon: Users },
  { href: '/admin/leads', label: 'Leads & Marketing', icon: TrendingUp },
]

export default function AdminTabNav() {
  const pathname = usePathname()

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <nav className="flex gap-1 px-6" aria-label="Admin tabs">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-primary text-primary dark:text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
