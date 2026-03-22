'use client'

import { useState } from 'react'

interface Props {
  prompt: string
  aspect?: '1/1' | '16/9' | '9/16' | '1200/627' | '1200/630'
  accentColor?: string
  downloadName?: string
}

// Extrae palabras clave del prompt para LoremFlickr
function extractKeywords(prompt: string): string {
  const medical = ['medical', 'healthcare', 'doctor', 'health', 'medicine']
  const words = prompt.toLowerCase()
  if (words.includes('salud') || words.includes('médic') || words.includes('clinic')) return 'healthcare,doctor,medical'
  if (words.includes('tecnolog') || words.includes('digital') || words.includes('software')) return 'technology,medical,digital'
  if (words.includes('nutrici') || words.includes('alimenta')) return 'nutrition,food,health'
  if (words.includes('corazón') || words.includes('cardio')) return 'heart,cardiology,medical'
  if (words.includes('niño') || words.includes('pediatr')) return 'pediatrics,children,health'
  if (words.includes('mental') || words.includes('psicolog')) return 'mentalhealth,wellness,therapy'
  return 'healthcare,medical,doctor'
}

function getDimensions(aspect: string): { w: number; h: number } {
  if (aspect === '1/1') return { w: 600, h: 600 }
  if (aspect === '9/16') return { w: 400, h: 711 }
  if (aspect === '1200/627') return { w: 1200, h: 627 }
  if (aspect === '1200/630') return { w: 1200, h: 630 }
  return { w: 800, h: 450 } // 16/9
}

export default function AIImage({ prompt, aspect = '1/1', accentColor = 'blue', downloadName = 'post-image.jpg' }: Props) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 9000) + 1000)

  const keywords = extractKeywords(prompt)
  const { w, h } = getDimensions(aspect)
  const src = `https://loremflickr.com/${w}/${h}/${keywords}?lock=${seed}`

  function retry() {
    setStatus('loading')
    setSeed(Math.floor(Math.random() * 9000) + 1000)
  }

  const spinnerColor = {
    pink: 'border-pink-500',
    blue: 'border-blue-500',
    teal: 'border-teal-400',
  }[accentColor] ?? 'border-blue-500'

  const btnColor = {
    pink: 'bg-pink-500 hover:bg-pink-600',
    blue: 'bg-blue-600 hover:bg-blue-700',
    teal: 'bg-teal-500 hover:bg-teal-600',
  }[accentColor] ?? 'bg-blue-600 hover:bg-blue-700'

  const textColor = {
    pink: 'hover:text-pink-600',
    blue: 'hover:text-blue-600',
    teal: 'hover:text-teal-500',
  }[accentColor] ?? 'hover:text-blue-600'

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Imagen sugerida</p>
      <div
        className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 w-full"
        style={{ aspectRatio: aspect.replace('/', '/') }}
      >
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className={`w-8 h-8 border-4 ${spinnerColor} border-t-transparent rounded-full animate-spin`} />
            <p className="text-xs text-gray-400">Cargando imagen...</p>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-gray-400 text-center">No se pudo cargar</p>
            <button onClick={retry} className={`text-xs px-3 py-1 rounded-lg ${btnColor} text-white`}>
              Reintentar
            </button>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={prompt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${status === 'ok' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('error')}
        />
      </div>
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-400 italic truncate flex-1 line-clamp-1">{prompt}</p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={retry} className={`text-xs text-gray-400 ${textColor} transition-colors`}>
            Nueva imagen
          </button>
          {status === 'ok' && (
            <a
              href={src}
              download={downloadName}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Descargar
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
