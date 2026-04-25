import { describe, it, expect } from 'vitest'
import { SaraPublicSchema } from '@/lib/validation/schemas/sara'

describe('SaraPublicSchema', () => {
  const valid = {
    slug: 'dr-lopez',
    messages: [{ role: 'user', content: 'hola' }],
  }

  it('accepts minimal payload', () => {
    expect(SaraPublicSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts optional choice and finalContent', () => {
    expect(SaraPublicSchema.safeParse({ ...valid, choice: 'A', finalContent: 'final' }).success).toBe(true)
  })

  it('rejects missing slug', () => {
    expect(SaraPublicSchema.safeParse({ messages: valid.messages }).success).toBe(false)
  })

  it('rejects empty messages', () => {
    expect(SaraPublicSchema.safeParse({ slug: 'x', messages: [] }).success).toBe(false)
  })

  it('preserves extra fields via passthrough', () => {
    const r = SaraPublicSchema.safeParse({ ...valid, customMeta: { a: 1 } })
    expect(r.success).toBe(true)
  })

  it('rejects slug longer than 100 chars', () => {
    expect(SaraPublicSchema.safeParse({ ...valid, slug: 'a'.repeat(101) }).success).toBe(false)
  })
})
