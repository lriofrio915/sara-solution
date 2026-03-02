'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface PublicPageCardProps {
  slug: string
  appUrl: string
}

export default function PublicPageCard({ slug, appUrl }: PublicPageCardProps) {
  const publicUrl = `${appUrl}/${slug}`
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('input')
      el.value = publicUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🌐</span>
        <h2 className="font-bold text-gray-900 dark:text-white">Tu página pública</h2>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
        Comparte este link con tus pacientes para que agenden citas con Sara.
      </p>

      {/* URL + copy */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 overflow-hidden">
          <p className="text-gray-700 dark:text-gray-300 text-xs font-mono truncate">{publicUrl}</p>
        </div>
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            copied
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          aria-label="Copiar link"
        >
          {copied ? '✓ Copiado' : '📋 Copiar'}
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6">
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Ver mi página
        </a>
        <a
          href={`/${slug}/chat`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          💬 Chat
        </a>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Escanea el QR para acceder</p>
        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
          <QRCodeSVG
            value={publicUrl}
            size={120}
            level="M"
            bgColor="#ffffff"
            fgColor="#1e293b"
          />
        </div>
      </div>
    </div>
  )
}
