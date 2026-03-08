'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const SARA_AVATAR = 'https://useileqhvoxljyxpjgfb.supabase.co/storage/v1/object/public/avatars/gemini_sara_perfil.png'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO string for serialization
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
    '¡Hola! Soy **Sara**, tu asistente médica IA.\n\nPuedo ayudarte a:\n- 📋 Registrar y buscar pacientes\n- 📅 Gestionar citas y agenda\n- 💊 Crear recetas y prescripciones\n- 📊 Revisar historiales clínicos\n- 🔔 Crear recordatorios\n- 📚 Consultar tu base de conocimiento\n\n¿En qué te puedo ayudar hoy?',
  timestamp: new Date().toISOString(),
}

// Simple markdown → HTML renderer
function renderMarkdown(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inList = false

  for (const raw of lines) {
    let line = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    line = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>')

    if (/^### /.test(line)) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<h3 class="font-semibold text-gray-800 mt-3 mb-1">${line.slice(4)}</h3>`)
    } else if (/^## /.test(line)) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<h2 class="font-bold text-gray-900 mt-3 mb-1 text-base">${line.slice(3)}</h2>`)
    } else if (/^# /.test(line)) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<h1 class="font-bold text-gray-900 mt-3 mb-1 text-lg">${line.slice(2)}</h1>`)
    } else if (/^- /.test(line)) {
      if (!inList) { result.push('<ul class="my-2 space-y-0.5 list-disc ml-4">'); inList = true }
      result.push(`<li>${line.slice(2)}</li>`)
    } else if (/^\d+\. /.test(line)) {
      if (!inList) { result.push('<ul class="my-2 space-y-0.5 list-decimal ml-4">'); inList = true }
      result.push(`<li>${line.replace(/^\d+\. /, '')}</li>`)
    } else {
      if (inList) { result.push('</ul>'); inList = false }
      if (line.trim() === '') {
        result.push('<br/>')
      } else {
        result.push(`<p class="mb-1">${line}</p>`)
      }
    }
  }

  if (inList) result.push('</ul>')
  return result.join('')
}

function SaraAvatar({ size = 8 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SARA_AVATAR}
      alt="Sara"
      className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0 shadow-sm`}
    />
  )
}

// Save debounce timer ref
let saveTimer: ReturnType<typeof setTimeout> | null = null

export default function SaraPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toolStatuses, setToolStatuses] = useState<ToolStatus[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Load conversation from DB on mount ──────────────────────────────────────
  useEffect(() => {
    fetch('/api/sara/conversation')
      .then(r => r.json())
      .then(data => {
        const saved = data.messages as Message[]
        if (Array.isArray(saved) && saved.length > 0) {
          // Prepend welcome only if not already there
          const hasWelcome = saved[0]?.id === 'welcome'
          setMessages(hasWelcome ? saved : [WELCOME_MESSAGE, ...saved])
        }
      })
      .catch(() => {/* use default welcome */})
      .finally(() => setLoaded(true))
  }, [])

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, toolStatuses])

  // ── Persist conversation after messages change (debounced) ──────────────────
  useEffect(() => {
    if (!loaded) return // Don't save until initial load is done
    if (messages.length <= 1) return // Only welcome msg — nothing to save

    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      fetch('/api/sara/conversation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      }).catch(() => {/* silent */})
    }, 1000)

    return () => {
      if (saveTimer) clearTimeout(saveTimer)
    }
  }, [messages, loaded])

  // ── Clear chat ───────────────────────────────────────────────────────────────
  async function handleClear() {
    setShowClearConfirm(false)
    await fetch('/api/sara/conversation', { method: 'DELETE' })
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date().toISOString() }])
  }

  // ── Send message ─────────────────────────────────────────────────────────────
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
          body: JSON.stringify({ messages: history }),
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
              setToolStatuses(prev => [
                ...prev,
                { name: event.name!, message: event.message ?? event.name!, done: false },
              ])
            } else if (event.type === 'tool_done' && event.name) {
              setToolStatuses(prev =>
                prev.map(t => t.name === event.name ? { ...t, done: true } : t),
              )
            } else if (event.type === 'content_start') {
              assembled = ''
              setStreamingContent('')
            } else if (event.type === 'chunk' && event.text) {
              assembled += event.text
              setStreamingContent(assembled)
            } else if (event.type === 'done') {
              const finalContent = assembled
              setStreamingContent('')
              setToolStatuses([])
              setMessages(prev => [
                ...prev,
                {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: finalContent,
                  timestamp: new Date().toISOString(),
                },
              ])
            } else if (event.type === 'error') {
              throw new Error((event as { message?: string }).message ?? 'Error de Sara')
            }
          }
        }
      } catch (err) {
        setStreamingContent('')
        setToolStatuses([])
        const errMsg = err instanceof Error ? err.message : 'Error desconocido'
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Lo siento, ocurrió un error: **${errMsg}**\n\nSi el problema persiste, verifica que las variables de entorno (OPENROUTER_API_KEY) estén configuradas.`,
            timestamp: new Date().toISOString(),
          },
        ])
      } finally {
        setLoading(false)
        inputRef.current?.focus()
      }
    },
    [loading, messages],
  )

  const isThinking = loading && toolStatuses.length === 0 && !streamingContent

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SaraAvatar size={10} />
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white">Sara</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Asistente médica IA · Conectada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a href="/knowledge" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            📚 Conocimiento
          </a>

          {/* Limpiar chat */}
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Limpiar conversación"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Limpiar chat
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5">
              <span className="text-xs text-red-600 dark:text-red-400">¿Borrar todo?</span>
              <button onClick={handleClear} className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700">Sí</button>
              <span className="text-red-300">·</span>
              <button onClick={() => setShowClearConfirm(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">No</button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 dark:text-gray-100">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' ? (
              <SaraAvatar size={8} />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0 text-gray-600 dark:text-gray-300">
                Dr
              </div>
            )}
            <div className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary text-white rounded-tr-sm'
                : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-tl-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                msg.content
              )}
              <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Tool statuses */}
        {toolStatuses.length > 0 && (
          <div className="flex gap-3">
            <SaraAvatar size={8} />
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 space-y-1.5">
              {toolStatuses.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {t.done ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />
                  )}
                  <span className={t.done ? 'line-through opacity-60' : ''}>{t.message}...</span>
                </div>
              ))}
              {streamingContent && (
                <div
                  className="text-sm text-gray-700 dark:text-gray-200 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }}
                />
              )}
            </div>
          </div>
        )}

        {/* Streaming (sin tools) */}
        {streamingContent && toolStatuses.length === 0 && (
          <div className="flex gap-3">
            <SaraAvatar size={8} />
            <div className="max-w-[72%] bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }} />
              <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
            </div>
          </div>
        )}

        {/* Thinking dots */}
        {isThinking && (
          <div className="flex gap-3">
            <SaraAvatar size={8} />
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
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
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_ACTIONS.map(a => (
              <button key={a.label} onClick={() => { setInput(a.text); inputRef.current?.focus() }}
                className="flex-shrink-0 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary text-gray-600 dark:text-gray-300 px-3 py-2 rounded-xl transition-colors whitespace-nowrap shadow-sm">
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4">
        <form onSubmit={e => { e.preventDefault(); sendMessage(input) }} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escríbele a Sara..."
            className="input flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            disabled={loading}
            autoComplete="off"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="btn-primary px-5 py-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
        <p className="text-gray-400 text-xs mt-2 text-center">
          Sara puede cometer errores. Verifica la información médica importante.
        </p>
      </div>
    </div>
  )
}
