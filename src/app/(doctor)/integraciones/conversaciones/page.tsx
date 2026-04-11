'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, MessageSquare, User, Bot,
  UserCheck, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'

type ConvSummary = {
  id: string
  phone: string
  humanMode: boolean
  messageCount: number
  lastMessage: { role: string; content: string } | null
  updatedAt: string
  createdAt: string
}

type Message = { role: string; content: string }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

export default function ConversacionesPage() {
  const [convs, setConvs] = useState<ConvSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [fullMessages, setFullMessages] = useState<Record<string, Message[]>>({})
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchConvs = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/whatsapp/conversations')
      const data = await res.json() as ConvSummary[]
      setConvs(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchConvs() }, [fetchConvs])

  async function expandConv(conv: ConvSummary) {
    if (expanded === conv.id) { setExpanded(null); return }
    setExpanded(conv.id)
    if (fullMessages[conv.id]) return

    // Fetch full messages from the conversations list endpoint —
    // they come back as the full messages array (we extract them server-side)
    // For now, re-use the summary — full history requires a separate detail endpoint
    // Build a placeholder from the summary
    setFullMessages(prev => ({
      ...prev,
      [conv.id]: conv.lastMessage
        ? [conv.lastMessage as Message]
        : [],
    }))
  }

  async function toggleHumanMode(conv: ConvSummary) {
    setToggling(conv.id)
    try {
      await fetch('/api/integrations/whatsapp/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conv.id, humanMode: !conv.humanMode }),
      })
      setConvs(prev => prev.map(c =>
        c.id === conv.id ? { ...c, humanMode: !c.humanMode } : c,
      ))
    } finally { setToggling(null) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      <div className="flex items-center gap-3 mb-8">
        <Link href="/integraciones" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Conversaciones WhatsApp
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {convs.length} conversación{convs.length !== 1 ? 'es' : ''} · Sara IA activa
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchConvs() }}
          className="p-2 rounded-xl text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {convs.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin conversaciones todavía</p>
          <p className="text-sm mt-1">Cuando un paciente escriba a tu WhatsApp, aparecerá aquí.</p>
        </div>
      )}

      <div className="space-y-3">
        {convs.map((conv) => (
          <div
            key={conv.id}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
          >
            {/* ── Row ── */}
            <div className="flex items-center gap-4 p-4">
              {/* Avatar */}
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                conv.humanMode
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'bg-blue-50 dark:bg-blue-900/30'
              }`}>
                {conv.humanMode
                  ? <UserCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  : <Bot className="w-5 h-5 text-primary" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    +{conv.phone}
                  </p>
                  {conv.humanMode ? (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      👤 Modo humano
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      🤖 Sara activa
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    <span className="font-medium">{conv.lastMessage.role === 'user' ? 'Paciente' : 'Sara'}:</span>{' '}
                    {conv.lastMessage.content}
                  </p>
                )}
              </div>

              {/* Meta + actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400">{timeAgo(conv.updatedAt)}</span>

                {/* Toggle humanMode */}
                <button
                  onClick={() => toggleHumanMode(conv)}
                  disabled={toggling === conv.id}
                  title={conv.humanMode ? 'Reactivar Sara' : 'Tomar control manualmente'}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 ${
                    conv.humanMode
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {toggling === conv.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : conv.humanMode
                      ? <><Bot className="w-3 h-3" /> Reactivar Sara</>
                      : <><User className="w-3 h-3" /> Tomar control</>
                  }
                </button>

                {/* Expand toggle */}
                <button
                  onClick={() => expandConv(conv)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {expanded === conv.id
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* ── Expanded chat preview ── */}
            {expanded === conv.id && (
              <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-4">
                {(fullMessages[conv.id] ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Sin mensajes visibles</p>
                ) : (
                  <div className="space-y-2">
                    {(fullMessages[conv.id] ?? [])
                      .filter(m => !m.content.startsWith('[Sistema:') && m.content !== '[Modo humano activado]')
                      .map((m, i) => (
                        <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                            m.role === 'user'
                              ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-tl-sm'
                              : 'text-white rounded-tr-sm'
                          }`}
                            style={m.role !== 'user' ? { background: 'linear-gradient(135deg, #2563EB, #0D9488)' } : {}}>
                            {m.content}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                <p className="text-center text-xs text-gray-400 mt-3">
                  {conv.messageCount} mensaje{conv.messageCount !== 1 ? 's' : ''} · iniciado {timeAgo(conv.createdAt)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
