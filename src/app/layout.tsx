import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Sara Medical | Gestión médica inteligente con IA',
    template: '%s | Sara Medical',
  },
  description:
    'Sara Medical — La plataforma SaaS para médicos que integra gestión de pacientes, citas, historia clínica y asistente IA en un solo lugar.',
  keywords: [
    'gestión médica',
    'software médico',
    'historia clínica electrónica',
    'agenda médica',
    'asistente IA médico',
    'consultorio',
    'Ecuador',
  ],
  authors: [{ name: 'Sara Medical' }],
  openGraph: {
    type: 'website',
    locale: 'es_EC',
    url: 'https://consultorio.site',
    siteName: 'Sara Medical',
    title: 'Sara Medical | Gestión médica inteligente con IA',
    description:
      'Gestiona tu consultorio con inteligencia artificial. Pacientes, citas, recetas y más.',
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
