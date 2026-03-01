'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export const dynamic = 'force-dynamic'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
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

// Simple markdown → HTML renderer (bold, italic, lists, headings)
function renderMarkdown(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inList = false

  for (const raw of lines) {
    // Escape HTML
    let line = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Inline formatting
    line = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>')

    // Headings
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

export default function SaraPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content:
        '¡Hola! Soy **Sara**, tu asistente médica IA.\n\nPuedo ayudarte a:\n- 📋 Registrar y buscar pacientes\n- 📅 Gestionar citas y agenda\n- 💊 Crear recetas y prescripciones\n- 📊 Revisar historiales clínicos\n- 🔔 Crear recordatorios\n- 📚 Consultar tu base de conocimiento\n\n¿En qué te puedo ayudar hoy?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toolStatuses, setToolStatuses] = useState<ToolStatus[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, toolStatuses])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setLoading(true)
      setToolStatuses([])
      setStreamingContent('')

      // Build history for API (exclude initial welcome message from history)
      const history = [...messages.filter((m) => m.id !== '0'), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      try {
        const res = await fetch('/api/sara', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
        })

        if (!res.ok || !res.body) throw new Error(`Error ${res.status}`)

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
            try {
              event = JSON.parse(line.slice(6))
            } catch {
              continue
            }

            if (event.type === 'tool_start' && event.name) {
              setToolStatuses((prev) => [
                ...prev,
                { name: event.name!, message: event.message ?? event.name!, done: false },
              ])
            } else if (event.type === 'tool_done' && event.name) {
              setToolStatuses((prev) =>
                prev.map((t) => (t.name === event.name ? { ...t, done: true } : t)),
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
              setMessages((prev) => [
                ...prev,
                {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: finalContent,
                  timestamp: new Date(),
                },
              ])
            } else if (event.type === 'error') {
              throw new Error((event as { message?: string }).message ?? 'Error de Sara')
            }
          }
        }
      } catch (err) {
        console.error('Sara chat error:', err)
        setStreamingContent('')
        setToolStatuses([])
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              'Lo siento, tuve un problema procesando tu solicitud. Por favor intenta de nuevo.',
            timestamp: new Date(),
          },
        ])
      } finally {
        setLoading(false)
        inputRef.current?.focus()
      }
    },
    [loading, messages],
  )

  const handleQuickAction = (text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }

  const isThinking = loading && toolStatuses.length === 0 && !streamingContent

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg shadow-md">
            S
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Sara</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Asistente médica IA · Conectada
            </p>
          </div>
        </div>
        <a
          href="/knowledge"
          className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
        >
          📚 Base de conocimiento
        </a>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-sm'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {msg.role === 'assistant' ? 'S' : 'Dra'}
            </div>
            <div
              className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-tr-sm'
                  : 'bg-white shadow-sm border border-gray-100 text-gray-700 rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                msg.content
              )}
              <p
                className={`text-xs mt-1.5 ${
                  msg.role === 'user' ? 'text-white/60' : 'text-gray-400'
                }`}
              >
                {msg.timestamp.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Tool statuses */}
        {toolStatuses.length > 0 && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              S
            </div>
            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 space-y-1.5">
              {toolStatuses.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
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
                  className="text-sm text-gray-700 mt-2 pt-2 border-t border-gray-100"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }}
                />
              )}
            </div>
          </div>
        )}

        {/* Streaming (no tools) */}
        {streamingContent && toolStatuses.length === 0 && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              S
            </div>
            <div className="max-w-[72%] bg-white shadow-sm border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }} />
              <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
            </div>
          </div>
        )}

        {/* Thinking dots */}
        {isThinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              S
            </div>
            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions (shown only at start) */}
      {messages.length === 1 && !loading && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => handleQuickAction(a.text)}
                className="flex-shrink-0 text-xs bg-white border border-gray-200 hover:border-primary hover:text-primary text-gray-600 px-3 py-2 rounded-xl transition-colors whitespace-nowrap shadow-sm"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-100 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
          className="flex gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escríbele a Sara..."
            className="input flex-1"
            disabled={loading}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-primary px-5 py-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
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
