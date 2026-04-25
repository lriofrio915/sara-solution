'use client'

import Image from 'next/image'
import Link from 'next/link'

interface SaraLogoProps {
  dark?: boolean      // fondo oscuro → texto blanco
  forceDark?: boolean // fuerza texto oscuro sin importar el color scheme del sistema
  size?: 'sm' | 'md'
  href?: string
}

const ICON_URL = 'https://res.cloudinary.com/deusntwkn/image/upload/v1773867085/icono_sara_bj4txo.png'

export default function SaraLogo({ dark = false, forceDark = false, size = 'md', href = '/' }: SaraLogoProps) {
  const iconSize = size === 'sm' ? 32 : 36
  const textSize = size === 'sm' ? 'text-sm' : 'text-lg'

  const textColor = dark
    ? 'text-white'
    : forceDark
      ? 'text-gray-900'
      : 'text-gray-900 dark:text-white'

  const subColor = dark
    ? 'text-white/85'
    : forceDark
      ? 'text-gray-400'
      : 'text-gray-400 dark:text-slate-300'

  return (
    <Link href={href} className="flex items-center gap-2.5 flex-shrink-0">
      <Image
        src={ICON_URL}
        alt="Sara Medical"
        width={iconSize}
        height={iconSize}
        className="rounded-xl"
        priority
      />
      <span className={`font-bold tracking-tight transition-colors duration-300 ${textSize} ${textColor}`}>
        Sara<span className={`font-light transition-colors duration-300 ${subColor}`}> Medical</span>
      </span>
    </Link>
  )
}
