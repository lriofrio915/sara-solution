'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const GREETING: Message = {
  role: 'assistant',
  content: '¡Hola! 👋 Soy Sara, la asistente virtual de este consultorio. Estoy aquí para responder tus preguntas y ayudarte a agendar tu cita. ¿En qué puedo ayudarte?',
}

function getStorageKey(slug: string) { return `sara_doctor_chat_${slug}_v1` }
function getLeadKey(slug: string) { return `sara_doctor_lead_${slug}_done` }

export default function DoctorChatWidget({
  slug,
  doctorName,
  doctorAvatar,
}: {
  slug: string
  doctorName: string
  doctorAvatar?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [leadDone, setLeadDone] = useState(false)
  const [unread, setUnread] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(slug))
      if (saved) setMessages(JSON.parse(saved))
      setLeadDone(!!localStorage.getItem(getLeadKey(slug)))
    } catch { /* ignore */ }
  }, [slug])

  // Persist to localStorage
  useEffect(() => {
    try { localStorage.setItem(getStorageKey(slug), JSON.stringify(messages)) } catch { /* ignore */ }
  }, [messages, slug])

  // Scroll to bottom
  useEffect(() => {
    if (open) setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }, [messages, open, loading])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setUnread(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const extractLead = useCallback(async (text: string): Promise<string> => {
    const match = text.match(/\[LEAD:name=([^|]+)\|phone=([^|]+)\|message=([^\]]*)\]/)
    const cleanText = text.replace(/\[LEAD:[^\]]+\]/g, '').trim()

    if (!match || leadDone) return cleanText

    const [, name, phone, message] = match
    const nameTrimmed = name.trim()
    const phoneTrimmed = phone.trim()

    const INVALID = ['nombre', 'telefono', 'no especificado', 'no especificada', 'desconocida', '—', '-', '']
    const nameInvalid = INVALID.some(v => nameTrimmed.toLowerCase() === v) || nameTrimmed.length < 2
    const phoneInvalid = INVALID.some(v => phoneTrimmed.toLowerCase() === v) || phoneTrimmed.length < 6

    if (nameInvalid || phoneInvalid) return cleanText

    try {
      await fetch(`/api/public/${slug}/patient-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameTrimmed,
          phone: phoneTrimmed,
          message: message.trim() || null,
          source: 'CHAT',
          campaign: 'chat-public',
        }),
      })
      setLeadDone(true)
      localStorage.setItem(getLeadKey(slug), '1')
    } catch { /* non-fatal */ }

    return cleanText
  }, [leadDone, slug])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`/api/public-chat/${slug}`, {
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
        content: 'Hubo un problema técnico. Por favor escríbenos directamente por WhatsApp o llámanos al consultorio.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([GREETING])
    setLeadDone(false)
    try {
      localStorage.removeItem(getStorageKey(slug))
      localStorage.removeItem(getLeadKey(slug))
    } catch { /* ignore */ }
  }

  const avatarSrc = 'https://useileqhvoxljyxpjgfb.supabase.co/storage/v1/object/public/avatars/gemini_sara_perfil.png'

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Chatear con la asistente virtual"
        className="fixed bottom-20 right-6 md:bottom-6 z-50 w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 transition-all duration-200 group"
        style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #0D9488 100%)' }}
      >
        <span className="absolute inset-0 rounded-2xl animate-ping opacity-20"
          style={{ background: '#2563EB', animationDuration: '2.8s' }} />

        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        {unread && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white z-20" />
        )}

        <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Asistente virtual
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-end sm:p-6 pointer-events-none">
          <div
            className="absolute inset-0 bg-black/40 sm:hidden pointer-events-auto"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full sm:w-[380px] h-[560px] max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden border border-gray-100">

            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #0D9488 100%)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc}
                alt={doctorName}
                className="w-9 h-9 rounded-full object-cover border-2 border-white/30 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">Asistente de {doctorName}</p>
                <p className="text-blue-200 text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  En línea · Respuesta inmediata
                </p>
              </div>
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
                      src={avatarSrc}
                      alt="Asistente"
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

              {loading && (
                <div className="flex gap-2 items-end justify-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarSrc} alt="Asistente" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.18}s` }} />
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
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-gray-50"
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
                Asistente virtual de <span className="font-semibold">{doctorName}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
