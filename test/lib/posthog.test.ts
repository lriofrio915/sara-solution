import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('posthog server helper', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.POSTHOG_API_KEY
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('no-ops when POSTHOG_API_KEY is missing', async () => {
    const { trackEvent } = await import('@/lib/posthog/server')
    // Should resolve without throwing, without making network calls
    await expect(trackEvent('user-1', 'lead_captured')).resolves.toBeUndefined()
  })

  it('no-ops when NEXT_PUBLIC_POSTHOG_HOST is missing even if key is set', async () => {
    process.env.POSTHOG_API_KEY = 'phx_test'
    const { trackEvent } = await import('@/lib/posthog/server')
    await expect(trackEvent('user-1', 'lead_captured')).resolves.toBeUndefined()
  })

  it('shutdownPosthog is safe to call when client never initialized', async () => {
    const { shutdownPosthog } = await import('@/lib/posthog/server')
    await expect(shutdownPosthog()).resolves.toBeUndefined()
  })
})
