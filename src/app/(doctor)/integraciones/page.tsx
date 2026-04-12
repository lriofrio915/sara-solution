'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plug, Loader2, CheckCircle2, XCircle, RefreshCw, Trash2, AlertCircle, MessageSquare } from 'lucide-react'

type Status = {
  evolutionInstance: string | null
  connectionState: 'open' | 'connecting' | 'close' | 'unknown' | null
  phoneNumber: string | null
}

type SocialAccount = {
  connected: boolean
  userId: string | null
  expiresAt: string | null
}
type SocialAccounts = {
  instagram: SocialAccount
  facebook: SocialAccount
  linkedin: SocialAccount
}

const SOCIAL_CONFIG = {
  linkedin: {
    label: 'LinkedIn',
    desc: 'Publica contenido de marketing directamente en tu perfil',
    oauthPath: '/api/auth/linkedin',
    bg: 'bg-[#0A66C2]',
    cardBg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700/50',
    icon: (
      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    desc: 'Publica fotos y reels de tu consultorio automáticamente',
    oauthPath: '/api/auth/meta',
    bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    cardBg: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700/50',
    icon: (
      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  facebook: {
    label: 'Facebook',
    desc: 'Publica en tu página de Facebook Business',
    oauthPath: '/api/auth/meta',
    bg: 'bg-[#1877F2]',
    cardBg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50',
    icon: (
      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
} as const

// ── Sub-component that reads search params (must be inside Suspense) ─────────

type BannerMsg = { ok: boolean; text: string }

function OAuthBannerReader({ onBanner }: { onBanner: (b: BannerMsg | null) => void }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const success = searchParams.get('success')
    const err = searchParams.get('error')
    if (success === 'linkedin') {
      onBanner({ ok: true, text: 'LinkedIn conectado correctamente.' })
      router.replace('/integraciones')
    } else if (err === 'linkedin_denied') {
      onBanner({ ok: false, text: 'Conexión cancelada por el usuario.' })
      router.replace('/integraciones')
    } else if (err === 'linkedin_failed') {
      onBanner({ ok: false, text: 'Error al conectar LinkedIn. Intenta de nuevo.' })
      router.replace('/integraciones')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntegracionesPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [instanceInput, setInstanceInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [settingWebhook, setSettingWebhook] = useState(false)
  const [webhookMsg, setWebhookMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Social accounts state
  const [socialAccounts, setSocialAccounts] = useState<SocialAccounts | null>(null)
  const [disconnectingSocial, setDisconnectingSocial] = useState<string | null>(null)

  // OAuth result banner (set by OAuthBannerReader)
  const [oauthBanner, setOauthBanner] = useState<BannerMsg | null>(null)

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

  const fetchSocialAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/accounts')
      const data = await res.json()
      if (data?.accounts) setSocialAccounts(data.accounts)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    Promise.all([fetchStatus(), fetchSocialAccounts()]).then(() => setLoading(false))
  }, [fetchStatus, fetchSocialAccounts])

  async function handleDisconnectSocial(platform: string) {
    setDisconnectingSocial(platform)
    try {
      await fetch(`/api/marketing/accounts?platform=${platform}`, { method: 'DELETE' })
      await fetchSocialAccounts()
    } finally {
      setDisconnectingSocial(null)
    }
  }

  function socialTokenDaysLeft(expiresAt: string | null): number | null {
    if (!expiresAt) return null
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

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

  async function handleSetupWebhook() {
    setSettingWebhook(true)
    setWebhookMsg(null)
    try {
      const res = await fetch('/api/integrations/whatsapp/setup-webhook', { method: 'POST' })
      const data = await res.json() as { ok?: boolean; error?: string; webhookUrl?: string }
      if (!res.ok || data.error) {
        setWebhookMsg({ ok: false, text: data.error ?? 'Error al configurar webhook' })
      } else {
        setWebhookMsg({ ok: true, text: `Webhook activado. Sara recibirá mensajes en: ${data.webhookUrl}` })
      }
    } catch {
      setWebhookMsg({ ok: false, text: 'Error de conexión' })
    } finally {
      setSettingWebhook(false)
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

      {/* Reads ?success/error params after OAuth redirect — must be in Suspense */}
      <Suspense fallback={null}>
        <OAuthBannerReader onBanner={setOauthBanner} />
      </Suspense>

      {/* ── OAuth result banner ───────────────────────────────────────────────── */}
      {oauthBanner && (
        <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
          oauthBanner.ok
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
        }`}>
          {oauthBanner.ok
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <XCircle className="w-4 h-4 flex-shrink-0" />
          }
          {oauthBanner.text}
          <button onClick={() => setOauthBanner(null)} className="ml-auto text-current opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

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

              {/* Webhook setup */}
              <div className="space-y-2">
                <button
                  onClick={handleSetupWebhook}
                  disabled={settingWebhook}
                  className="flex items-center gap-2 text-sm text-primary font-semibold hover:opacity-80 disabled:opacity-50 transition-opacity"
                >
                  {settingWebhook
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4" />}
                  Activar / sincronizar agente Sara
                </button>
                {webhookMsg && (
                  <p className={`text-xs rounded-lg px-3 py-2 ${webhookMsg.ok
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                    {webhookMsg.text}
                  </p>
                )}
              </div>

              <Link
                href="/integraciones/conversaciones"
                className="flex items-center gap-2 text-sm text-primary font-semibold hover:opacity-80 transition-opacity"
              >
                <MessageSquare className="w-4 h-4" />
                Ver conversaciones de pacientes →
              </Link>

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

      {/* ── Redes Sociales ──────────────────────────────────────────────────── */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Redes Sociales</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Conecta tus cuentas para publicar contenido de marketing directamente desde Sara.
          </p>
        </div>

        <div className="space-y-3">
          {(['linkedin', 'instagram', 'facebook'] as const).map(platform => {
            const cfg = SOCIAL_CONFIG[platform]
            const account = socialAccounts?.[platform]
            const daysLeft = socialTokenDaysLeft(account?.expiresAt ?? null)
            const expired = daysLeft !== null && daysLeft <= 0
            const expiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7

            return (
              <div key={platform} className={`rounded-2xl border p-4 ${cfg.cardBg}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{cfg.label}</p>
                    {socialAccounts === null ? (
                      <p className="text-xs text-gray-400">Verificando...</p>
                    ) : account?.connected && !expired ? (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Cuenta conectada
                        {expiringSoon && daysLeft !== null && (
                          <span className="ml-1 text-amber-600 dark:text-amber-400">· vence en {daysLeft}d</span>
                        )}
                      </p>
                    ) : expired ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Token expirado — reconecta tu cuenta</p>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cfg.desc}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {socialAccounts === null && (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                    )}
                    {socialAccounts !== null && (!account?.connected || expired) && (
                      <a href={cfg.oauthPath}
                        className="text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-opacity hover:opacity-90 flex-shrink-0"
                        style={platform === 'instagram' ? { background: 'linear-gradient(to right, #7c3aed, #ec4899)' } : { background: platform === 'facebook' ? '#1877F2' : '#0A66C2' }}>
                        {expired ? 'Reconectar' : 'Conectar'}
                      </a>
                    )}
                    {socialAccounts !== null && account?.connected && !expired && (
                      <button
                        onClick={() => handleDisconnectSocial(platform)}
                        disabled={disconnectingSocial === platform}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-300 hover:border-red-300 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50">
                        {disconnectingSocial === platform ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Desconectar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          Una vez conectadas, puedes publicar directamente desde la sección{' '}
          <Link href="/marketing/linkedin/trending" className="text-primary hover:underline">Marketing → Redes Sociales</Link>.
        </p>
      </div>

    </div>
  )
}
