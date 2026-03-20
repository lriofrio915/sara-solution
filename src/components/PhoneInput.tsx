'use client'

import React from 'react'

/**
 * Formats a phone number string to the pattern +593 XX XXX XXXX.
 * Handles local Ecuador format (09XXXXXXXXX) automatically.
 */
export function formatPhone(raw: string): string {
  // Keep only digits
  let d = raw.replace(/\D/g, '')

  // Local Ecuador format: 0XXXXXXXXX → 593XXXXXXXXX
  if (d.startsWith('0')) d = '593' + d.slice(1)

  if (d.startsWith('593')) {
    const r = d.slice(3, 12) // up to 9 digits after country code
    let out = '+593'
    if (r.length === 0) return out
    out += ' ' + r.slice(0, 2)
    if (r.length <= 2) return out
    out += ' ' + r.slice(2, 5)
    if (r.length <= 5) return out
    out += ' ' + r.slice(5, 9)
    return out
  }

  // Non-Ecuador: just keep + prefix with raw digits (no grouping)
  return d.length > 0 ? '+' + d.slice(0, 15) : ''
}

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Drop-in replacement for <input type="tel"> with automatic +593 XX XXX XXXX formatting.
 * Compatible with both handleChange(e) patterns and inline (e) => setState(e.target.value).
 */
export default function PhoneInput({ onChange, ...props }: Props) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value)
    e.target.value = formatted
    onChange?.(e)
  }

  return (
    <input
      {...props}
      type="tel"
      maxLength={16}
      onChange={handleChange}
    />
  )
}
