'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  href: string
  label: string
  icon: string
}

export default function PatientTabNav({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto -mb-px scrollbar-hide">
      {tabs.map((tab) => {
        // Exact match for the summary tab, prefix match for others
        const isExact = tab.href === tabs[0].href
        const active = isExact
          ? pathname === tab.href
          : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active
                ? 'border-primary text-primary dark:text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
