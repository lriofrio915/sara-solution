import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { PostHogPageview } from '@/components/PostHogPageview'
import { SITE } from '@/lib/seo'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  // metadataBase resuelve a absoluto todo lo relativo (OG, canonical, iconos). Apunta a
  // www porque el apex responde 307 y una imagen OG detrás de un redirect no la renderiza
  // ni WhatsApp ni Slack.
  metadataBase: new URL(SITE.url),
  // 38 chars — dentro del límite recomendado de 60
  title: {
    default: 'Sara Medical | Software Médico con IA',
    template: '%s | Sara Medical',
  },
  // 143 chars — dentro del límite recomendado de 155
  description: SITE.description,
  keywords: [
    'software médico',
    'gestión de consultorio',
    'historia clínica electrónica',
    'agenda médica inteligente',
    'asistente IA médico',
    'recetas digitales',
    'marketing médico',
    'consultorio Ecuador',
  ],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  applicationName: SITE.name,
  // La app muestra teléfonos y cédulas: sin esto iOS los convierte en enlaces y rompe
  // el layout de las fichas.
  formatDetection: { telephone: false, address: false, email: false },
  alternates: {
    canonical: SITE.url,
    languages: { [SITE.lang]: SITE.url },
  },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: 'Sara Medical | Software Médico con IA',
    description:
      'Automatiza tu consultorio médico con IA. Agenda de citas, recetas digitales, marketing automatizado y más.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sara Medical | Software Médico con IA',
    description:
      'Automatiza tu consultorio médico con IA. Agenda de citas, recetas digitales, marketing automatizado y más.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Inline script to apply dark class before first paint — prevents FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body className={inter.className}>
        <PostHogPageview />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1E293B',
              color: '#F8FAFC',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  )
}
