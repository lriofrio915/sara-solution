'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// Web Speech API type shim (not always in TS DOM lib)
type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: { 0: { transcript: string; isFinal: boolean }; isFinal: boolean }[] }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

interface DoctorInfo {
  name: string
  specialty: string
  avatarUrl: string | null
  slug: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const QUICK_ACTIONS = [
  { label: '📅 Agendar cita', message: 'Quiero agendar una cita' },
  { label: '🕐 Ver disponibilidad', message: '¿Cuáles son los horarios disponibles?' },
  { label: '📍 Info del consultorio', message: '¿Dónde queda el consultorio y cuáles son los servicios?' },
]

export default function DoctorChatUI({ doctor }: { doctor: DoctorInfo }) {
  const initials = getInitials(doctor.name)
  const firstName = doctor.name.split(' ')[0]

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `¡Hola! Soy Sara, la asistente de ${doctor.name}. ¿En qué puedo ayudarte hoy?\n\nPuedo ayudarte a **agendar una cita**, consultar **horarios de atención** o darte **información del consultorio**.`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  function toggleVoice() {
    if (isListening) {
      stopListening()
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-EC'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('')
      setInput(transcript)
    }

    recognition.onerror = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
      // Focus input after voice ends so user can review/send
      setTimeout(() => inputRef.current?.focus(), 100)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMessage: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/sara/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          slug: doctor.slug,
        }),
      })

      if (!res.ok) throw new Error('Error en la respuesta')
      const data = await res.json()

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.content ?? 'Lo siento, no pude procesar tu solicitud.' },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.' },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Render markdown-lite (bold, newlines)
  function renderContent(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      return (
        <span key={i}>
          {part.split('\n').map((line, j) => (
            <span key={j}>
              {line}
              {j < part.split('\n').length - 1 && <br />}
            </span>
          ))}
        </span>
      )
    })
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header
        className="flex items-center gap-4 px-4 py-4 text-white shadow-lg flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
      >
        <a
          href={`/${doctor.slug}`}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          aria-label="Volver"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>

        {doctor.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doctor.avatarUrl}
            alt={doctor.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">Sara — Asistente de {firstName}</p>
          <p className="text-white/90 text-xs">{doctor.specialty}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/90 text-xs">En línea</span>
        </div>
      </header>

      {/* Quick actions (shown only when just the welcome message) */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 px-4 pt-4 flex-shrink-0">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => sendMessage(action.message)}
              disabled={loading}
              className="text-sm bg-white border border-blue-100 text-blue-700 font-medium px-4 py-2 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors shadow-sm disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            {msg.role === 'assistant' && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
              >
                ✨
              </div>
            )}

            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
              }`}
            >
              {renderContent(msg.content)}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
            >
              ✨
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 shadow-lg">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Escuchando...' : 'Escribe o habla tu mensaje...'}
            rows={1}
            disabled={loading}
            className={`flex-1 resize-none rounded-2xl border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-blue-500 transition disabled:opacity-50 ${
              isListening
                ? 'border-red-300 bg-red-50 focus:ring-red-300/30'
                : 'border-gray-200 bg-gray-50 focus:ring-blue-500/30'
            }`}
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
          />

          {/* Mic button — only shown if browser supports it */}
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              disabled={loading}
              aria-label={isListening ? 'Detener grabación' : 'Hablar'}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                isListening
                  ? 'bg-red-500 text-white shadow-lg scale-110 animate-pulse'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40'
              }`}
            >
              {isListening ? (
                /* Stop icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                /* Mic icon */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0D9488 100%)' }}
            aria-label="Enviar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-center text-gray-400 text-xs mt-2">
          {isListening
            ? '🔴 Grabando... habla ahora. Toca el cuadrado para detener.'
            : 'Sara es una asistente IA. Para emergencias, llama al 911.'}
        </p>
      </div>
    </div>
  )
}
