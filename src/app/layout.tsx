import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Dra. Stéfanny Medrano | Medicina Interna',
    template: '%s | Dra. Medrano',
  },
  description:
    'Dra. Stéfanny Medrano - Especialista en Medicina Interna. Atención integral para adultos y adulto mayor. Agenda tu cita hoy.',
  keywords: [
    'medicina interna',
    'doctora',
    'diabetes',
    'hipertensión',
    'adulto mayor',
    'consulta médica',
    'Ecuador',
  ],
  authors: [{ name: 'Dra. Stéfanny Medrano' }],
  openGraph: {
    type: 'website',
    locale: 'es_EC',
    url: 'https://doctoramedranointernista.com',
    siteName: 'Dra. Stéfanny Medrano',
    title: 'Dra. Stéfanny Medrano | Medicina Interna',
    description:
      'Especialista en Medicina Interna. Atención integral para adultos y adulto mayor.',
    images: [
      {
        url: 'https://i.ibb.co/pjdT6ncH/logo-de-la-doctora-medrano.png',
        width: 1200,
        height: 630,
        alt: 'Dra. Stéfanny Medrano',
      },
    ],
  },
  icons: {
    icon: 'https://i.ibb.co/pjdT6ncH/logo-de-la-doctora-medrano.png',
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
