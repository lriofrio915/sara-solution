'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import SaraChatPanel from '@/components/SaraChatPanel'

const BTN = 56 // w-14 h-14

export default function SaraFAB() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [patientName, setPatientName] = useState<string | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const moved = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Init position after mount (bottom-24 right-5 on mobile)
  useEffect(() => {
    setPos({
      x: window.innerWidth - BTN - 20,
      y: window.innerHeight - BTN - 96,
    })
  }, [])

  // Detect patient from pathname: /patients/[id]/...
  useEffect(() => {
    const match = pathname.match(/\/patients\/([^/]+)/)
    const id = match ? match[1] : null
    setPatientId(id)
    setPatientName(null)
    if (id) {
      fetch(`/api/patients/${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.name) setPatientName(data.name) })
        .catch(() => {})
    }
  }, [pathname])

  const startDrag = useCallback((clientX: number, clientY: number) => {
    if (!pos) return
    dragging.current = true
    moved.current = false
    dragOffset.current = { x: clientX - pos.x, y: clientY - pos.y }
  }, [pos])

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current) return
    moved.current = true
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - BTN, clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - BTN, clientY - dragOffset.current.y)),
    })
  }, [])

  const endDrag = useCallback(() => { dragging.current = false }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return
      e.preventDefault()
      moveDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
    const onUp = () => endDrag()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [moveDrag, endDrag])

  // Don't show on the Sara full-page view
  if (pathname === '/sara' || !pos) return null

  // Panel position: open above button if there's room, else below
  const vw = window.innerWidth
  const vh = window.innerHeight
  const pw = Math.min(vw * 0.92, 448)
  const ph = Math.min(vh * 0.70, 600)
  const panelLeft = Math.max(8, Math.min(vw - pw - 8, pos.x + BTN - pw))
  const openAbove = pos.y > ph + 16
  const panelTop = openAbove ? pos.y - ph - 8 : pos.y + BTN + 8

  return (
    <>
      {/* Draggable floating action button */}
      <button
        onMouseDown={e => startDrag(e.clientX, e.clientY)}
        onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onClick={() => { if (!moved.current) setOpen(v => !v) }}
        aria-label="Hablar con Sara IA"
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-50 group touch-none select-none cursor-grab active:cursor-grabbing"
      >
        <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/50 hover:-translate-y-1 transition-all duration-200 ${open ? 'scale-95' : ''}`}>
          {!open && (
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-secondary opacity-40 animate-ping" style={{ animationDuration: '2.5s' }} />
          )}
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
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

      {/* Popup panel — positioned relative to button */}
      {open && (
        <div
          className="fixed z-40 rounded-2xl shadow-2xl shadow-black/20 border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
          style={{ left: panelLeft, top: panelTop, width: pw, height: ph }}
        >
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
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
      )}
    </>
  )
}
