'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = 'sara_landing_chat_v2'
const LEAD_KEY = 'sara_landing_lead_done'

type Message = { role: 'user' | 'assistant'; content: string }

const GREETING: Message = {
  role: 'assistant',
  content: '¡Hola! 👋 Soy Sara, la asistente IA de Sara Medical. ¿Eres médico y buscas una solución para gestionar tu consultorio con inteligencia artificial? Con gusto te cuento todo. ¿Por dónde empezamos?',
}

export default function SaraChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [leadDone, setLeadDone] = useState(false)
  const [unread, setUnread] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setMessages(JSON.parse(saved))
      setLeadDone(!!localStorage.getItem(LEAD_KEY))
    } catch { /* ignore */ }
  }, [])

  // Persist to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch { /* ignore */ }
  }, [messages])

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (open) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
    }
  }, [messages, open, loading])

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const extractLead = useCallback(async (text: string): Promise<string> => {
    const match = text.match(/\[LEAD:name=([^|]+)\|phone=([^|]+)\|specialty=([^\]]+)\]/)
    // Always strip the marker from displayed text
    const cleanText = text.replace(/\[LEAD:[^\]]+\]/g, '').trim()

    if (!match || leadDone) return cleanText

    const [, name, phone, specialty] = match
    const nameTrimmed = name.trim()
    const phoneTrimmed = phone.trim()

    // Reject if the AI used placeholder/default values instead of real user data
    const INVALID = ['nombre', 'telefono', 'no especificado', 'no especificada', 'desconocida', '—', '-', '']
    const nameInvalid = INVALID.some(v => nameTrimmed.toLowerCase() === v) || nameTrimmed.length < 2
    const phoneInvalid = INVALID.some(v => phoneTrimmed.toLowerCase() === v) || phoneTrimmed.length < 6

    if (nameInvalid || phoneInvalid) return cleanText

    try {
      await fetch('/api/leads/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameTrimmed,
          phone: phoneTrimmed,
          specialty: INVALID.includes(specialty.trim().toLowerCase()) ? '' : specialty.trim(),
          source: 'LANDING',
          campaign: 'chat-landing',
          utmSource: 'landing-chat',
        }),
      })
      setLeadDone(true)
      localStorage.setItem(LEAD_KEY, '1')
    } catch { /* non-fatal */ }

    return cleanText
  }, [leadDone])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/landing-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })
      const data = await res.json()
      const clean = await extractLead(data.text ?? '')
      setMessages(prev => [...prev, { role: 'assistant', content: clean }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Hubo un problema técnico. Escríbenos al WhatsApp +593 996 691 586 🙏',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    setUnread(false)
  }

  function clearChat() {
    setMessages([GREETING])
    setLeadDone(false)
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(LEAD_KEY)
    } catch { /* ignore */ }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        aria-label="Chatear con Sara IA"
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 transition-all duration-200 group"
        style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #0D9488 100%)' }}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-2xl animate-ping opacity-20"
          style={{ background: '#2563EB', animationDuration: '2.8s' }} />

        {/* Icon */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        {/* Unread dot */}
        {unread && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white z-20" />
        )}

        {/* Tooltip */}
        <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Chat con Sara IA
        </span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-end sm:p-6 pointer-events-none">
          {/* Backdrop — mobile only */}
          <div
            className="absolute inset-0 bg-black/40 sm:hidden pointer-events-auto"
            onClick={() => setOpen(false)}
          />

          {/* Chat panel */}
          <div className="relative w-full sm:w-[380px] h-[560px] max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden border border-gray-100">

            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #0D9488 100%)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://useileqhvoxljyxpjgfb.supabase.co/storage/v1/object/public/avatars/gemini_sara_perfil.png"
                alt="Sara"
                className="w-9 h-9 rounded-full object-cover border-2 border-white/30 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">Sara IA</p>
                <p className="text-blue-200 text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Sara Medical · En línea
                </p>
              </div>
              {/* Limpiar chat */}
              <button
                onClick={clearChat}
                className="text-white/85 hover:text-white transition-colors flex-shrink-0 p-1"
                aria-label="Limpiar conversación"
                title="Limpiar conversación"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
              {/* Cerrar */}
              <button
                onClick={() => setOpen(false)}
                className="text-white/85 hover:text-white transition-colors flex-shrink-0 p-1"
                aria-label="Cerrar chat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 bg-gray-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start items-end'}`}>
                  {m.role === 'assistant' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="https://useileqhvoxljyxpjgfb.supabase.co/storage/v1/object/public/avatars/gemini_sara_perfil.png"
                      alt="Sara"
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-0.5"
                    />
                  )}
                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'rounded-tr-sm text-white shadow-sm'
                        : 'bg-white rounded-tl-sm text-gray-800 shadow-sm border border-gray-100'
                    }`}
                    style={m.role === 'user' ? { background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' } : {}}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-2 items-end justify-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://useileqhvoxljyxpjgfb.supabase.co/storage/v1/object/public/avatars/gemini_sara_perfil.png"
                    alt="Sara"
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.18}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <form
                onSubmit={e => { e.preventDefault(); sendMessage() }}
                className="flex gap-2 items-center"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Escribe tu pregunta..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all hover:scale-105 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
                  aria-label="Enviar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                Powered by <span className="font-semibold">Sara Medical AI</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
