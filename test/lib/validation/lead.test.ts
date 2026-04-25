import { describe, it, expect } from 'vitest'
import {
  LeadCreateSchema,
  LeadUpdateSchema,
  LeadWebhookSchema,
  PatientLeadCreateSchema,
  PatientLeadUpdateSchema,
} from '@/lib/validation/schemas/lead'

describe('LeadCreateSchema', () => {
  const valid = { name: 'Dr. López' }

  it('accepts minimal payload', () => {
    expect(LeadCreateSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects missing name', () => {
    expect(LeadCreateSchema.safeParse({}).success).toBe(false)
  })

  it('trims name automatically', () => {
    const r = LeadCreateSchema.safeParse({ name: '  Ana  ' })
    if (r.success) expect(r.data.name).toBe('Ana')
    else throw new Error('expected success')
  })

  it('rejects malformed email', () => {
    expect(LeadCreateSchema.safeParse({ name: 'X', email: 'bad' }).success).toBe(false)
  })

  it('rejects unknown fields (strict)', () => {
    expect(LeadCreateSchema.safeParse({ name: 'X', extra: 'oops' }).success).toBe(false)
  })

  it('rejects name shorter than 2', () => {
    expect(LeadCreateSchema.safeParse({ name: 'A' }).success).toBe(false)
  })
})

describe('LeadUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(LeadUpdateSchema.safeParse({}).success).toBe(true)
  })

  it('accepts partial update', () => {
    expect(LeadUpdateSchema.safeParse({ status: 'CONTACTADO', notes: 'llamé' }).success).toBe(true)
  })

  it('rejects unknown fields (strict partial — bug fix)', () => {
    // This is the security fix: previously body was spread directly, allowing
    // injection of `id`, `createdAt`, etc.
    expect(LeadUpdateSchema.safeParse({ id: 'forged-id', status: 'NUEVO' }).success).toBe(false)
    expect(LeadUpdateSchema.safeParse({ createdAt: '1970-01-01', status: 'NUEVO' }).success).toBe(false)
  })
})

describe('LeadWebhookSchema', () => {
  it('accepts n8n payload with utm fields', () => {
    const r = LeadWebhookSchema.safeParse({
      name: 'Dr. Pérez',
      email: 'p@x.com',
      phone: '0991234567',
      specialty: 'Cardio',
      city: 'Quito',
      source: 'INSTAGRAM',
      campaign: 'spring-2026',
      utmSource: 'ig',
      utmMedium: 'cpc',
      utmCampaign: 'launch',
    })
    expect(r.success).toBe(true)
  })

  it('rejects missing name', () => {
    expect(LeadWebhookSchema.safeParse({ email: 'x@y.com' }).success).toBe(false)
  })

  it('rejects unknown fields', () => {
    expect(LeadWebhookSchema.safeParse({ name: 'X', injected: 'oops' }).success).toBe(false)
  })
})

describe('PatientLeadCreateSchema', () => {
  it('accepts valid patient lead', () => {
    const r = PatientLeadCreateSchema.safeParse({ name: 'Maria', phone: '5551234', source: 'CHAT' })
    expect(r.success).toBe(true)
  })

  it('rejects missing name', () => {
    expect(PatientLeadCreateSchema.safeParse({ phone: '5551234' }).success).toBe(false)
  })

  it('phone is optional', () => {
    expect(PatientLeadCreateSchema.safeParse({ name: 'Maria' }).success).toBe(true)
  })
})

describe('PatientLeadUpdateSchema', () => {
  it('accepts status-only update', () => {
    expect(PatientLeadUpdateSchema.safeParse({ status: 'AGENDADO' }).success).toBe(true)
  })

  it('rejects injected createdAt', () => {
    expect(PatientLeadUpdateSchema.safeParse({ createdAt: 'forged' }).success).toBe(false)
  })
})
