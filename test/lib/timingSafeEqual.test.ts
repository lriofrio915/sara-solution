import { describe, it, expect } from 'vitest'
import { timingSafeStringEqual } from '@/lib/timingSafeEqual'

describe('timingSafeStringEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeStringEqual('secret', 'secret')).toBe(true)
  })

  it('returns false for different strings of same length', () => {
    expect(timingSafeStringEqual('secret', 'sxcret')).toBe(false)
  })

  it('returns false for strings of different length', () => {
    expect(timingSafeStringEqual('short', 'longer-secret')).toBe(false)
  })

  it('returns false when first arg is null or undefined', () => {
    expect(timingSafeStringEqual(null, 'secret')).toBe(false)
    expect(timingSafeStringEqual(undefined, 'secret')).toBe(false)
  })

  it('returns false when second arg is null or undefined', () => {
    expect(timingSafeStringEqual('secret', null)).toBe(false)
    expect(timingSafeStringEqual('secret', undefined)).toBe(false)
  })

  it('returns false when both are empty', () => {
    expect(timingSafeStringEqual('', '')).toBe(false)
  })

  it('handles unicode correctly', () => {
    expect(timingSafeStringEqual('señor', 'señor')).toBe(true)
    expect(timingSafeStringEqual('señor', 'senor')).toBe(false)
  })
})
