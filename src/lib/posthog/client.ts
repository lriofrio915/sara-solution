'use client'

import posthog from 'posthog-js'

/**
 * Read the current visitor's PostHog distinct ID, if the SDK is loaded.
 * Returns null on SSR, before init, or if PostHog wasn't configured.
 *
 * Used to thread the same distinctId from client-side $pageview events into
 * server-side funnel events (lead_captured, contact_submitted, appointment_booked).
 * Without this, each funnel event creates a new "person" in PostHog and the
 * journey can't be reconstructed.
 */
export function getPosthogDistinctId(): string | null {
  if (typeof window === 'undefined') return null
  // posthog-js exposes __loaded after .init() resolves
  if (!(posthog as unknown as { __loaded?: boolean }).__loaded) return null
  try {
    const id = posthog.get_distinct_id()
    return typeof id === 'string' && id.length > 0 ? id : null
  } catch {
    return null
  }
}

/**
 * Add `x-posthog-distinct-id` to the headers if available. No-op otherwise.
 *
 * Usage with apiPostJson:
 *   apiPostJson('/api/leads/public', body, { headers: withPosthogHeaders() })
 */
export function withPosthogHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const id = getPosthogDistinctId()
  if (!id) return headers
  return { ...headers, 'x-posthog-distinct-id': id }
}
