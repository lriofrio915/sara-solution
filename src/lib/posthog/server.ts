import { PostHog } from 'posthog-node'

/**
 * Server-side PostHog client for funnel events.
 *
 * No-ops when POSTHOG_API_KEY or NEXT_PUBLIC_POSTHOG_HOST are not configured —
 * safe to call anywhere without env-gated checks at the call site.
 *
 * Privacy:
 * - Properties must NEVER include PHI (patient name, phone, email, message).
 * - distinctId should be a non-PII opaque identifier (cuid, hashed slug).
 * - Use the EU host (eu.posthog.com) or a self-hosted instance.
 */

let client: PostHog | null = null

function getClient(): PostHog | null {
  if (client) return client
  const key = process.env.POSTHOG_API_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key || !host) {
    // Diagnostic: surface why we no-op so it shows in Vercel logs
    if (!warnedMissingEnv) {
      console.warn('[posthog/server] no-op: missing env vars', {
        hasKey: !!key,
        hasHost: !!host,
      })
      warnedMissingEnv = true
    }
    return null
  }
  client = new PostHog(key, {
    host,
    flushAt: 1, // serverless: flush immediately, no batching
    flushInterval: 0,
    disableGeoip: false,
  })
  return client
}

let warnedMissingEnv = false

export type FunnelEvent =
  | 'lead_captured'
  | 'contact_submitted'
  | 'appointment_booked'

/**
 * Fire-and-await PostHog event capture. Awaits the flush so the request
 * doesn't terminate (Vercel) before the network call resolves.
 *
 * Latency: ~30-100ms. For non-critical-path events you can wrap in
 * void Promise.race([trackEvent(...), timeout(50)]) to bound it.
 *
 * Never throws — failures are swallowed to keep the request handler resilient.
 */
export async function trackEvent(
  distinctId: string,
  event: FunnelEvent,
  properties?: Record<string, unknown>,
): Promise<void> {
  const c = getClient()
  if (!c) return
  try {
    c.capture({ distinctId, event, properties })
    await c.flush()
    console.log(`[posthog/server] event sent: ${event}`)
  } catch (err) {
    // never crash the request handler
    console.warn('[posthog/server] capture failed', {
      event,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/** Flush any pending events. Call from edge/serverless cleanup if available. */
export async function shutdownPosthog(): Promise<void> {
  if (!client) return
  try {
    await client.shutdown()
  } catch {
    // ignore
  }
}
