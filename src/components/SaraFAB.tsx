'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import SaraChatPanel from '@/components/SaraChatPanel'

export default function SaraFAB() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [patientName, setPatientName] = useState<string | null>(null)

  // Detect patient from pathname: /patients/[id]/...
  useEffect(() => {
    const match = pathname.match(/\/patients\/([^/]+)/)
    const id = match ? match[1] : null
    setPatientId(id)
    setPatientName(null)

    if (id) {
      fetch(`/api/patients/${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.name) setPatientName(data.name)
        })
        .catch(() => {})
    }
  }, [pathname])

  // Don't show on the Sara full-page view
  if (pathname === '/sara') return null

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Hablar con Sara IA"
        className="fixed bottom-24 right-5 md:bottom-8 md:right-6 z-50 group"
      >
        <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/50 hover:-translate-y-1 transition-all duration-200 ${open ? 'scale-95' : ''}`}>
          {!open && (
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-secondary opacity-40 animate-ping" style={{ animationDuration: '2.5s' }} />
          )}
          {open ? (
            // X icon when open
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            // Stethoscope + sparkle when closed
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 4.5C8 4.5 4 5.5 4 10C4 13.5 6.5 15.5 9 16.5V19C9 20.7 10.3 22 12 22C13.7 22 15 20.7 15 19V16.5C17.5 15.5 20 13.5 20 10C20 5.5 16 4.5 16 4.5"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="4" r="1.5" fill="white"/>
              <circle cx="19" cy="17" r="2" fill="white"/>
              <path d="M20.5 12.5l.8-.8M20.5 12.5l-.8-.8M20.5 12.5v-1.2M20.5 12.5v1.2"
                stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            </svg>
          )}
          {/* Tooltip */}
          {!open && (
            <span className="absolute right-16 bg-gray-900 dark:bg-gray-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              Hablar con Sara IA
            </span>
          )}
        </div>
      </button>

      {/* Popup panel */}
      {open && (
        <div className="fixed bottom-24 right-5 md:bottom-28 md:right-6 z-40 w-[92vw] max-w-sm md:max-w-md h-[70vh] max-h-[600px] rounded-2xl shadow-2xl shadow-black/20 border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <SaraChatPanel
            mode="popup"
            patientId={patientId}
            patientName={patientName}
            onClose={() => setOpen(false)}
          />
        </div>
      )}

      {/* Backdrop — closes popup when clicking outside */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
