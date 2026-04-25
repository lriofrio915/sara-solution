import { describe, it, expect } from 'vitest'
import { ChatBodySchema, ChatMessageSchema } from '@/lib/validation/schemas/chat'

describe('ChatMessageSchema', () => {
  it('accepts valid roles', () => {
    for (const role of ['user', 'assistant', 'system', 'tool']) {
      expect(ChatMessageSchema.safeParse({ role, content: 'hi' }).success).toBe(true)
    }
  })

  it('rejects invalid role', () => {
    expect(ChatMessageSchema.safeParse({ role: 'admin', content: 'hi' }).success).toBe(false)
  })

  it('rejects missing content', () => {
    expect(ChatMessageSchema.safeParse({ role: 'user' }).success).toBe(false)
  })

  it('rejects content longer than 10000 chars', () => {
    expect(ChatMessageSchema.safeParse({ role: 'user', content: 'a'.repeat(10001) }).success).toBe(false)
  })

  it('preserves extra fields via passthrough', () => {
    const r = ChatMessageSchema.safeParse({ role: 'user', content: 'hi', name: 'Ana', tool_call_id: 'abc' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect((r.data as Record<string, unknown>).name).toBe('Ana')
      expect((r.data as Record<string, unknown>).tool_call_id).toBe('abc')
    }
  })
})

describe('ChatBodySchema', () => {
  it('accepts a non-empty messages array', () => {
    const r = ChatBodySchema.safeParse({ messages: [{ role: 'user', content: 'hola' }] })
    expect(r.success).toBe(true)
  })

  it('rejects empty messages array', () => {
    expect(ChatBodySchema.safeParse({ messages: [] }).success).toBe(false)
  })

  it('rejects more than 50 messages', () => {
    const messages = Array.from({ length: 51 }, () => ({ role: 'user' as const, content: 'x' }))
    expect(ChatBodySchema.safeParse({ messages }).success).toBe(false)
  })

  it('rejects missing messages key', () => {
    expect(ChatBodySchema.safeParse({}).success).toBe(false)
  })

  it('rejects when messages is not an array', () => {
    expect(ChatBodySchema.safeParse({ messages: 'string' }).success).toBe(false)
  })
})
