'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plug, Loader2, CheckCircle2, XCircle, RefreshCw, Trash2, AlertCircle } from 'lucide-react'

type Status = {
  evolutionInstance: string | null
  connectionState: 'open' | 'connecting' | 'close' | 'unknown' | null
  phoneNumber: string | null
}

export default function IntegracionesPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [instanceInput, setInstanceInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/whatsapp')
      const data = await res.json() as Status
      setStatus(data)
      return data
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    fetchStatus().then(() => setLoading(false))
  }, [fetchStatus])

  // Poll QR every 4s when instance exists but not connected
  const fetchQR = useCallback(async () => {
    if (qrLoading) return
    setQrLoading(true)
    try {
      const res = await fetch('/api/integrations/whatsapp/qr')
      const data = await res.json() as { connected?: boolean; qr?: string | null; error?: string }
      if (data.connected) {
        // Connected! Stop polling, refresh status
        if (pollRef.current) clearInterval(pollRef.current)
        setQr(null)
        await fetchStatus()
      } else if (data.qr) {
        setQr(data.qr)
      }
    } catch {
      // ignore
    } finally {
      setQrLoading(false)
    }
  }, [fetchStatus, qrLoading])

  useEffect(() => {
    if (!status) return
    const needsQR = status.evolutionInstance && status.connectionState !== 'open'
    if (needsQR) {
      fetchQR()
      pollRef.current = setInterval(fetchQR, 4000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.evolutionInstance, status?.connectionState])

  async function handleCreate() {
    setError(null)
    setCreating(true)
    try {
      const res = await fetch('/api/integrations/whatsapp/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: instanceInput.trim() }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || data.error) {
        setError(data.error ?? 'Error al crear la instancia')
        return
      }
      await fetchStatus()
    } catch {
      setError('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('¿Desconectar este número de WhatsApp? Se detendrá el agente Sara para este consultorio.')) return
    setDisconnecting(true)
    try {
      await fetch('/api/integrations/whatsapp', { method: 'DELETE' })
      setQr(null)
      if (pollRef.current) clearInterval(pollRef.current)
      await fetchStatus()
    } finally {
      setDisconnecting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const isConnected = status?.connectionState === 'open'
  const hasInstance = !!status?.evolutionInstance

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Plug className="w-6 h-6 text-primary" />
          Integraciones
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Conecta tu número de WhatsApp Business para que Sara IA atienda a tus pacientes automáticamente.
        </p>
      </div>

      {/* ── WhatsApp Business Card ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#25D366' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 dark:text-white">WhatsApp Business + Agente Sara IA</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sara atiende a tus pacientes 24/7 con el conocimiento de tu consultorio
            </p>
          </div>
          {/* Status badge */}
          {isConnected && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
            </span>
          )}
          {hasInstance && !isConnected && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Esperando QR
            </span>
          )}
          {!hasInstance && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
              <XCircle className="w-3.5 h-3.5" /> Sin conectar
            </span>
          )}
        </div>

        <div className="p-6">

          {/* ── CONNECTED state ──────────────────────────────────────────── */}
          {isConnected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300 text-sm">
                    Número conectado{status.phoneNumber ? `: +${status.phoneNumber}` : ''}
                  </p>
                  <p className="text-green-700 dark:text-green-400 text-xs mt-0.5">
                    Instancia: <span className="font-mono">{status.evolutionInstance}</span>
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">Sara está activa para este número</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  Cuando un paciente escriba a este WhatsApp, Sara responderá automáticamente con el conocimiento de tu consultorio: horarios, servicios, precios y más.
                  Puedes personalizar su comportamiento desde <strong>Mi Perfil → Instrucciones para Sara</strong>.
                </p>
              </div>

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Desconectar este número
              </button>
            </div>
          )}

          {/* ── QR PENDING state ─────────────────────────────────────────── */}
          {hasInstance && !isConnected && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">Escanea el QR con tu WhatsApp Business</p>
                  <p className="text-amber-700 dark:text-amber-400 text-xs mt-1 leading-relaxed">
                    Abre WhatsApp Business en tu teléfono → Dispositivos vinculados → Vincular dispositivo → Escanea el código.
                  </p>
                </div>
              </div>

              {qr ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qr}
                    alt="QR WhatsApp"
                    className="w-56 h-56 rounded-2xl border-4 border-gray-100 dark:border-gray-700 shadow-md"
                  />
                  <button
                    onClick={fetchQR}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Actualizar QR
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-56 h-56 mx-auto rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                </div>
              )}

              <p className="text-center text-xs text-gray-400">
                Instancia: <span className="font-mono">{status.evolutionInstance}</span> · El QR se renueva automáticamente
              </p>

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Cancelar y eliminar instancia
              </button>
            </div>
          )}

          {/* ── SETUP state ──────────────────────────────────────────────── */}
          {!hasInstance && (
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Nombre de la instancia
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Elige un identificador único para tu instancia. Solo letras minúsculas, números y guiones.
                  Ejemplo: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">dr-garcia-consultorio</span>
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={instanceInput}
                    onChange={(e) => setInstanceInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="ej: dr-garcia-consultorio"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={creating || instanceInput.trim().length < 3}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                    style={{ background: '#25D366' }}
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {creating ? 'Creando...' : 'Conectar'}
                  </button>
                </div>

                {error && (
                  <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </p>
                )}
              </div>

              {/* How it works */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-5 space-y-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cómo funciona</p>
                {[
                  { step: '1', text: 'Escribe un nombre para tu instancia y haz clic en "Conectar"' },
                  { step: '2', text: 'Aparece un código QR — escanéalo con tu WhatsApp Business' },
                  { step: '3', text: 'Sara empieza a responder a tus pacientes automáticamente' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step}
                    </span>
                    {text}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  )
}
