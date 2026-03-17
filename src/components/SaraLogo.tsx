'use client'

import { useId } from 'react'
import Link from 'next/link'

interface SaraLogoProps {
  dark?: boolean      // fondo oscuro → texto blanco
  forceDark?: boolean // fuerza texto oscuro sin importar el color scheme del sistema
  size?: 'sm' | 'md'
  href?: string
}

export default function SaraLogo({ dark = false, forceDark = false, size = 'md', href = '/' }: SaraLogoProps) {
  const uid = useId().replace(/:/g, '')
  const gradId = `saraGrad_${uid}`

  const iconSize = size === 'sm' ? 32 : 36
  const textSize = size === 'sm' ? 'text-sm' : 'text-lg'

  // dark=true → siempre blanco (hero, auth panel izquierdo)
  // forceDark=true → siempre oscuro (navbar con fondo blanco fijo)
  // ninguno → sigue el color scheme del sistema
  const textColor = dark
    ? 'text-white'
    : forceDark
      ? 'text-gray-900'
      : 'text-gray-900 dark:text-white'

  const subColor = dark
    ? 'text-white/60'
    : forceDark
      ? 'text-gray-400'
      : 'text-gray-400 dark:text-slate-300'

  return (
    <Link href={href} className="flex items-center gap-2.5 flex-shrink-0">
      <svg width={iconSize} height={iconSize} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB"/>
            <stop offset="100%" stopColor="#0D9488"/>
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="10" fill={`url(#${gradId})`}/>
        <rect x="16.5" y="9" width="3" height="18" rx="1.5" fill="white" fillOpacity="0.2"/>
        <rect x="9" y="16.5" width="18" height="3" rx="1.5" fill="white" fillOpacity="0.2"/>
        <path
          d="M22 13.5C22 13.5 20.5 11.5 18 11.5C15.2 11.5 13.5 13 13.5 15C13.5 17 15 17.8 18 18.5C21 19.2 22.5 20.2 22.5 22.2C22.5 24.2 20.8 25.5 18 25.5C15.2 25.5 13.5 23.5 13.5 23.5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <span className={`font-bold tracking-tight transition-colors duration-300 ${textSize} ${textColor}`}>
        Sara<span className={`font-light transition-colors duration-300 ${subColor}`}> Medical</span>
      </span>
    </Link>
  )
}
