import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Captura el 10% de las transacciones de rendimiento
  tracesSampleRate: 0.1,

  // Session Replay deshabilitado — withSentryConfig ya inyecta su propia
  // instancia de Replay en el bundle; tener dos causa un crash de JS.
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
})
