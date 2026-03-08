import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  // 38 chars — dentro del límite recomendado de 60
  title: {
    default: 'Sara Medical | Software Médico con IA',
    template: '%s | Sara Medical',
  },
  // 143 chars — dentro del límite recomendado de 155
  description:
    'Automatiza tu consultorio médico con inteligencia artificial. Agenda de citas, recetas digitales, marketing automatizado y más. Prueba gratis.',
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
  authors: [{ name: 'Sara Medical' }],
  openGraph: {
    type: 'website',
    locale: 'es_EC',
    url: 'https://consultorio.site',
    siteName: 'Sara Medical',
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
