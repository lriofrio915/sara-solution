"use client"

import { useState, useEffect, useRef } from "react"
import { ExternalLink, RefreshCw } from "lucide-react"

const CARRUSEL_URL = "http://localhost:3002"

export default function CarruselPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const checkAndLoad = () => {
    setStatus("loading")
    fetch(CARRUSEL_URL, { mode: "no-cors" })
      .then(() => setStatus("ready"))
      .catch(() => setStatus("error"))
  }

  useEffect(() => {
    checkAndLoad()
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] px-6 md:px-8 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Carrusel IG</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Diseña carruseles para Instagram y exporta como PNG</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={checkAndLoad}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recargar
          </button>
          <a
            href={CARRUSEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir en pestaña
          </a>
        </div>
      </div>

      {status === "error" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
            <span className="text-4xl mb-3 block">🎠</span>
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
              open-carrusel no está corriendo
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
              El editor de carruseles corre como servidor local. Ábrelo en una terminal:
            </p>
            <code className="block bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-xs rounded-lg px-4 py-3 text-left font-mono mb-4">
              cd ~/Desktop/open-carrusel{"\n"}npm run dev
            </code>
            <button
              onClick={checkAndLoad}
              className="text-sm bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Conectando con open-carrusel...</span>
        </div>
      )}

      {status === "ready" && (
        <iframe
          ref={iframeRef}
          src={CARRUSEL_URL}
          className="flex-1 w-full border-0 rounded-xl shadow-sm"
          title="Open Carrusel"
          allow="clipboard-read; clipboard-write"
        />
      )}
    </div>
  )
}
