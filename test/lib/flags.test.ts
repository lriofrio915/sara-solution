import { describe, it, expect } from 'vitest'
import { parseFlagString, resolveFlags, isEnabled } from '@/lib/flags'

describe('parseFlagString', () => {
  it('returns empty set for null/undefined/empty', () => {
    expect(parseFlagString(null).size).toBe(0)
    expect(parseFlagString(undefined).size).toBe(0)
    expect(parseFlagString('').size).toBe(0)
  })

  it('parses comma-separated names', () => {
    const s = parseFlagString('marketing-suite,sara-notes')
    expect(s.has('marketing-suite' as never)).toBe(true)
    expect(s.has('sara-notes' as never)).toBe(true)
    expect(s.size).toBe(2)
  })

  it('trims whitespace', () => {
    const s = parseFlagString(' marketing-suite , sara-notes ')
    expect(s.has('marketing-suite' as never)).toBe(true)
    expect(s.has('sara-notes' as never)).toBe(true)
  })

  it('skips empty entries', () => {
    const s = parseFlagString('marketing-suite,,sara-notes,')
    expect(s.size).toBe(2)
  })
})

describe('resolveFlags resolution order', () => {
  it('URL flags win over cookie and env', () => {
    const flags = resolveFlags({
      urlFlags: 'marketing-suite',
      cookieFlags: 'sara-notes',
      env: { NEXT_PUBLIC_FEATURE_FLAGS: 'analytics-dashboard' },
    })
    expect(flags.has('marketing-suite' as never)).toBe(true)
    expect(flags.has('sara-notes' as never)).toBe(false)
    expect(flags.has('analytics-dashboard' as never)).toBe(false)
  })

  it('cookie wins over env when URL is empty', () => {
    const flags = resolveFlags({
      cookieFlags: 'sara-notes',
      env: { NEXT_PUBLIC_FEATURE_FLAGS: 'analytics-dashboard' },
    })
    expect(flags.has('sara-notes' as never)).toBe(true)
    expect(flags.has('analytics-dashboard' as never)).toBe(false)
  })

  it('env applies when URL and cookie are empty', () => {
    const flags = resolveFlags({
      env: { NEXT_PUBLIC_FEATURE_FLAGS: 'analytics-dashboard' },
    })
    expect(flags.has('analytics-dashboard' as never)).toBe(true)
  })

  it('falls back to empty default set', () => {
    const flags = resolveFlags({ env: {} })
    expect(flags.size).toBe(0)
  })
})

describe('isEnabled', () => {
  it('returns true when flag is in resolved set', () => {
    expect(isEnabled('marketing-suite', { urlFlags: 'marketing-suite' })).toBe(true)
  })

  it('returns false when flag is absent', () => {
    expect(isEnabled('marketing-suite', { urlFlags: 'sara-notes' })).toBe(false)
  })

  it('returns false in default config', () => {
    expect(isEnabled('marketing-suite', { env: {} })).toBe(false)
  })
})
