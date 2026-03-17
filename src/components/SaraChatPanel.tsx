'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Trash2, BookOpen, Mic, MicOff } from 'lucide-react'

// Web Speech API type shim
type SpeechRecognitionInstance = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onstart: (() => void) | null
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

const SARA_AVATAR = 'https://useileqhvoxljyxpjgfb.supabase.co/storage/v1/object/public/avatars/gemini_sara_perfil.png'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ToolStatus {
  name: string
  message: string
  done: boolean
}

const QUICK_ACTIONS = [
  { label: '📋 Registrar paciente', text: 'Quiero registrar un nuevo paciente' },
  { label: '📅 Citas de hoy', text: '¿Cuáles son mis citas para hoy?' },
  { label: '🔍 Buscar paciente', text: 'Busca al paciente ' },
  { label: '💊 Nueva receta', text: 'Crear receta para paciente ' },
  { label: '📄 Historial', text: 'Muéstrame el historial de ' },
  { label: '🔔 Recordatorio', text: 'Crear un recordatorio para ' },
]

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    '¡Hola! Soy **Sara**, tu asistente médico IA.\n\nPuedo ayudarte a:\n- 📋 Registrar y buscar pacientes\n- 📅 Gestionar citas y agenda\n- 💊 Crear recetas y prescripciones\n- 📊 Revisar historiales clínicos\n- 🔔 Crear recordatorios\n- 📚 Consultar tu base de conocimiento\n\n¿En qué te puedo ayudar hoy?',
  timestamp: new Date().toISOString(),
}

function renderMarkdown(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inList = false
  for (const raw of lines) {
    let line = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    line = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-sm font-mono">$1</code>')
    if (/^### /.test(line)) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<h3 class="font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1">${line.slice(4)}</h3>`)
    } else if (/^## /.test(line)) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<h2 class="font-bold text-gray-900 dark:text-white mt-3 mb-1 text-base">${line.slice(3)}</h2>`)
    } else if (/^- /.test(line)) {
      if (!inList) { result.push('<ul class="my-1.5 space-y-0.5 list-disc ml-4">'); inList = true }
      result.push(`<li>${line.slice(2)}</li>`)
    } else if (/^\d+\. /.test(line)) {
      if (!inList) { result.push('<ul class="my-1.5 space-y-0.5 list-decimal ml-4">'); inList = true }
      result.push(`<li>${line.replace(/^\d+\. /, '')}</li>`)
    } else {
      if (inList) { result.push('</ul>'); inList = false }
      if (line.trim() === '') result.push('<br/>')
      else result.push(`<p class="mb-1">${line}</p>`)
    }
  }
  if (inList) result.push('</ul>')
  return result.join('')
}

function SaraAvatar({ size = 8 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={SARA_AVATAR} alt="Sara"
      className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0 shadow-sm`} />
  )
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

interface Props {
  mode?: 'page' | 'popup'
  patientId?: string | null
  patientName?: string | null
  onClose?: () => void
}

export default function SaraChatPanel({ mode = 'page', patientId, patientName, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toolStatuses, setToolStatuses] = useState<ToolStatus[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const isPopup = mode === 'popup'

  // Check voice support
  useEffect(() => {
    const SR = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      ?? (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    setVoiceSupported(!!SR)
  }, [])

  // Load conversation from DB
  useEffect(() => {
    fetch('/api/sara/conversation')
      .then(r => r.json())
      .then(data => {
        const saved = data.messages as Message[]
        if (Array.isArray(saved) && saved.length > 0) {
          const hasWelcome = saved[0]?.id === 'welcome'
          setMessages(hasWelcome ? saved : [WELCOME_MESSAGE, ...saved])
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, toolStatuses])

  // Persist conversation
  useEffect(() => {
    if (!loaded || messages.length <= 1) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      fetch('/api/sara/conversation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      }).catch(() => {})
    }, 1000)
    return () => { if (saveTimer) clearTimeout(saveTimer) }
  }, [messages, loaded])

  // Focus input when popup opens
  useEffect(() => {
    if (isPopup) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isPopup])

  async function handleClear() {
    setShowClearConfirm(false)
    await fetch('/api/sara/conversation', { method: 'DELETE' })
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date().toISOString() }])
  }

  function toggleVoice() {
    if (isRecording) {
      recognitionRef.current?.stop()
      return
    }
    const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition
      ?? (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.lang = 'es-EC'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false
    recognition.onstart = () => setIsRecording(true)
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => (prev ? prev + ' ' + transcript : transcript))
      inputRef.current?.focus()
    }
    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)
    recognitionRef.current = recognition
    recognition.start()
  }

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, userMsg])
      setInput('')
      setLoading(true)
      setToolStatuses([])
      setStreamingContent('')

      const history = [...messages.filter(m => m.id !== 'welcome'), userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }))

      try {
        const res = await fetch('/api/sara', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            ...(patientId ? { patientId } : {}),
          }),
        })

        if (!res.ok || !res.body) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error ?? `Error ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let assembled = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            let event: { type: string; name?: string; message?: string; text?: string }
            try { event = JSON.parse(line.slice(6)) } catch { continue }

            if (event.type === 'tool_start' && event.name) {
              setToolStatuses(prev => [...prev, { name: event.name!, message: event.message ?? event.name!, done: false }])
            } else if (event.type === 'tool_done' && event.name) {
              setToolStatuses(prev => prev.map(t => t.name === event.name ? { ...t, done: true } : t))
            } else if (event.type === 'content_start') {
              assembled = ''; setStreamingContent('')
            } else if (event.type === 'chunk' && event.text) {
              assembled += event.text; setStreamingContent(assembled)
            } else if (event.type === 'done') {
              const finalContent = assembled
              setStreamingContent('')
              setToolStatuses([])
              setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: finalContent,
                timestamp: new Date().toISOString(),
              }])
            } else if (event.type === 'error') {
              throw new Error((event as { message?: string }).message ?? 'Error de Sara')
            }
          }
        }
      } catch (err) {
        setStreamingContent('')
        setToolStatuses([])
        const errMsg = err instanceof Error ? err.message : 'Error desconocido'
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Lo siento, ocurrió un error: **${errMsg}**`,
          timestamp: new Date().toISOString(),
        }])
      } finally {
        setLoading(false)
        inputRef.current?.focus()
      }
    },
    [loading, messages, patientId],
  )

  const isThinking = loading && toolStatuses.length === 0 && !streamingContent

  // ── RENDER ────────────────────────────────────────────────────────────────

  const containerCls = isPopup
    ? 'flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden'
    : 'flex flex-col h-full min-h-screen bg-gray-50 dark:bg-gray-900'

  return (
    <div className={containerCls}>

      {/* Header */}
      <div className={`bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0 ${isPopup ? 'px-4 py-3' : 'px-6 py-4'}`}>
        <div className="flex items-center gap-2.5">
          <SaraAvatar size={isPopup ? 8 : 10} />
          <div>
            <h1 className={`font-bold text-gray-900 dark:text-white ${isPopup ? 'text-sm' : ''}`}>Sara</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Asistente médico IA · Conectado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPopup && (
            <a href="/knowledge"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              <BookOpen size={12} /> Conocimiento
            </a>
          )}

          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Limpiar conversación"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-2 py-1">
              <span className="text-xs text-red-600 dark:text-red-400">¿Borrar?</span>
              <button onClick={handleClear} className="text-xs font-bold text-red-600 dark:text-red-400">Sí</button>
              <span className="text-red-300">·</span>
              <button onClick={() => setShowClearConfirm(false)} className="text-xs text-gray-500">No</button>
            </div>
          )}

          {isPopup && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Patient context badge */}
      {patientName && (
        <div className="px-4 py-2 bg-primary/5 dark:bg-primary/10 border-b border-primary/10 flex items-center gap-2 flex-shrink-0">
          <span className="w-2 h-2 bg-primary rounded-full" />
          <p className="text-xs text-primary font-medium">
            Contexto activo: <span className="font-bold">{patientName}</span>
          </p>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto space-y-3 dark:text-gray-100 ${isPopup ? 'px-3 py-3' : 'px-4 py-6 space-y-4'}`}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' ? (
              <SaraAvatar size={7} />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0 text-gray-600 dark:text-gray-300">
                Dr
              </div>
            )}
            <div className={`${isPopup ? 'max-w-[80%]' : 'max-w-[72%]'} rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary text-white rounded-tr-sm'
                : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-tl-sm'
            }`}>
              {msg.role === 'assistant'
                ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                : msg.content
              }
              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Tool statuses */}
        {toolStatuses.length > 0 && (
          <div className="flex gap-2.5">
            <SaraAvatar size={7} />
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-3.5 py-2.5 space-y-1.5">
              {toolStatuses.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {t.done
                    ? <span className="text-green-500">✓</span>
                    : <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />
                  }
                  <span className={t.done ? 'line-through opacity-60' : ''}>{t.message}...</span>
                </div>
              ))}
              {streamingContent && (
                <div className="text-sm text-gray-700 dark:text-gray-200 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }} />
              )}
            </div>
          </div>
        )}

        {streamingContent && toolStatuses.length === 0 && (
          <div className="flex gap-2.5">
            <SaraAvatar size={7} />
            <div className="max-w-[80%] bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }} />
              <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
            </div>
          </div>
        )}

        {isThinking && (
          <div className="flex gap-2.5">
            <SaraAvatar size={7} />
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-2 h-2 bg-gray-300 dark:bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {messages.length === 1 && !loading && (
        <div className={`flex-shrink-0 ${isPopup ? 'px-3 pb-2' : 'px-4 pb-2'}`}>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_ACTIONS.map(a => (
              <button key={a.label}
                onClick={() => { setInput(a.text); inputRef.current?.focus() }}
                className="flex-shrink-0 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap shadow-sm">
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex-shrink-0 ${isPopup ? 'p-3' : 'p-4'}`}>
        <form onSubmit={e => { e.preventDefault(); sendMessage(input) }} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isRecording ? 'Escuchando...' : patientName ? `Pregunta sobre ${patientName}...` : 'Escríbele a Sara...'}
            className={`flex-1 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${isPopup ? 'px-3 py-2' : 'input'} ${isRecording ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-600'}`}
            disabled={loading}
            autoComplete="off"
          />
          {/* Voice button */}
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              disabled={loading}
              title={isRecording ? 'Detener grabación' : 'Enviar mensaje de voz'}
              className={`rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${isPopup ? 'px-2.5 py-2' : 'px-3 py-3'} ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          )}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={`bg-primary text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex-shrink-0 ${isPopup ? 'px-3 py-2' : 'btn-primary px-5 py-3'}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
        {!isPopup && (
          <p className="text-gray-400 text-xs mt-2 text-center">
            Sara puede cometer errores. Verifica la información médica importante.
          </p>
        )}
      </div>
    </div>
  )
}
