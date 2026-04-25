import { describe, it, expect } from 'vitest'
import { ContactSchema } from '@/lib/validation/schemas/contact'

describe('ContactSchema', () => {
  const valid = {
    slug: 'dr-lopez',
    name: 'Maria Pérez',
    phone: '0991234567',
    email: 'maria@example.com',
    message: 'Quiero agendar',
  }

  it('accepts a valid contact payload', () => {
    expect(ContactSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts payload without optional fields', () => {
    const r = ContactSchema.safeParse({ slug: 'dr-lopez', name: 'Ana', phone: '5551234' })
    expect(r.success).toBe(true)
  })

  it('rejects when slug is missing', () => {
    const { slug, ...rest } = valid
    void slug
    expect(ContactSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects when name is missing', () => {
    const { name, ...rest } = valid
    void name
    expect(ContactSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects when phone is missing', () => {
    const { phone, ...rest } = valid
    void phone
    expect(ContactSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects name shorter than 2 chars', () => {
    expect(ContactSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    expect(ContactSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false)
  })

  it('rejects phone shorter than 7 chars', () => {
    expect(ContactSchema.safeParse({ ...valid, phone: '12345' }).success).toBe(false)
  })

  it('rejects phone longer than 20 chars', () => {
    expect(ContactSchema.safeParse({ ...valid, phone: '1'.repeat(21) }).success).toBe(false)
  })

  it('rejects malformed email', () => {
    expect(ContactSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects message longer than 2000 chars', () => {
    expect(ContactSchema.safeParse({ ...valid, message: 'a'.repeat(2001) }).success).toBe(false)
  })
})
