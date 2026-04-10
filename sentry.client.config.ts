import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Captura el 10% de las transacciones de rendimiento
  tracesSampleRate: 0.1,

  // Captura replays solo cuando hay un error
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,    // oculta texto (datos médicos)
      blockAllMedia: true,  // bloquea imágenes
    }),
  ],
})
