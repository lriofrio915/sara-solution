/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@prisma/client',
    'prisma',
    '@sparticuz/chromium',
    'puppeteer-core',
    '@remotion/renderer',
    '@remotion/bundler',
    '@remotion/studio',
    'remotion',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'image.pollinations.ai' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async headers() {
    // CSP en modo Report-Only. Permite observar violaciones en producción 1-2 semanas
    // antes de promover a enforcement. Migrar a nonce-based para eliminar 'unsafe-inline'
    // queda como follow-up (requiere middleware que inyecte nonce por request).
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' cubre el theme-script en layout.tsx y los scripts inline de Next.js (hydration).
      // 'unsafe-eval' es requerido por React DevTools en dev y algunos chunks de Next.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // Permisivo en img-src: doctores suben imágenes a múltiples CDNs y Sara genera vía Pollinations.
      "img-src 'self' data: blob: https:",
      // Orígenes contactados por el cliente: Supabase (auth/db), PostHog EU (analytics),
      // OpenRouter (Sara chat público), Facebook Graph (OAuth callback flow client-side si aplica).
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://eu.posthog.com https://eu-assets.i.posthog.com https://openrouter.ai https://graph.facebook.com",
      "frame-ancestors 'self'",
      "frame-src 'self' https://*.fly.dev",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ]
  },
}

module.exports = nextConfig
