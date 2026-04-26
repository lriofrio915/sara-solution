'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'

let initialized = false

function ensureInit() {
  if (initialized) return
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key || !host) return // no-op when unconfigured

  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // we track pageviews manually below
    capture_pageleave: true,
    autocapture: false, // CRITICAL: healthcare app, never auto-grab DOM events
    capture_performance: false, // healthcare cleanliness: no Core Web Vitals auto-capture
    persistence: 'localStorage', // no 3rd-party cookies
    disable_session_recording: true, // never record sessions
    disable_surveys: true,
    person_profiles: 'identified_only', // no anonymous person profile spam
  })
  initialized = true
}

function Tracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    ensureInit()
    if (!initialized || !pathname) return
    const qs = searchParams?.toString()
    const url = window.location.origin + pathname + (qs ? `?${qs}` : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

export function PostHogPageview() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  )
}
