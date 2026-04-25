import { describe, it, expect } from 'vitest'
import { HotmartWebhookSchema } from '@/lib/validation/schemas/hotmart'
import { EvolutionWebhookSchema } from '@/lib/validation/schemas/evolution'

describe('HotmartWebhookSchema', () => {
  it('accepts a typical purchase payload', () => {
    const payload = {
      event: 'PURCHASE_COMPLETE',
      data: {
        buyer: { email: 'doc@example.com', name: 'Dr. X' },
        product: { id: 12345678, name: 'Pro Mensual' },
        purchase: { transaction: 'HP12345' },
      },
    }
    expect(HotmartWebhookSchema.safeParse(payload).success).toBe(true)
  })

  it('accepts empty object (all fields optional)', () => {
    expect(HotmartWebhookSchema.safeParse({}).success).toBe(true)
  })

  it('preserves unknown top-level fields via passthrough', () => {
    const r = HotmartWebhookSchema.safeParse({ event: 'X', creation_date: '2026-04-24', _custom: 'value' })
    expect(r.success).toBe(true)
    if (r.success) {
      const data = r.data as Record<string, unknown>
      expect(data.creation_date).toBe('2026-04-24')
      expect(data._custom).toBe('value')
    }
  })

  it('rejects when event is empty string', () => {
    expect(HotmartWebhookSchema.safeParse({ event: '' }).success).toBe(false)
  })
})

describe('EvolutionWebhookSchema', () => {
  it('accepts a typical messages.upsert payload', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'sara-dr-lopez',
      data: {
        key: { remoteJid: '5491111@s.whatsapp.net', fromMe: false, id: 'abc' },
        pushName: 'Patient',
        message: { conversation: 'hola' },
        messageType: 'conversation',
      },
    }
    expect(EvolutionWebhookSchema.safeParse(payload).success).toBe(true)
  })

  it('accepts empty object (all fields optional)', () => {
    expect(EvolutionWebhookSchema.safeParse({}).success).toBe(true)
  })

  it('preserves nested data shape via passthrough', () => {
    const r = EvolutionWebhookSchema.safeParse({
      event: 'connection.update',
      instance: 'x',
      data: [{ status: 'open' }],
    })
    expect(r.success).toBe(true)
  })

  it('rejects when instance is too long', () => {
    expect(EvolutionWebhookSchema.safeParse({ instance: 'a'.repeat(201) }).success).toBe(false)
  })
})
