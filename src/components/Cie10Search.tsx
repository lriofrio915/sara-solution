'use client'

import { useState, useEffect, useRef } from 'react'

interface Cie10Result {
  code: string
  description: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
}

export default function Cie10Search({ value, onChange, placeholder = 'Ej: J02 - Faringitis, hipertensión, diabetes...', label, className }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Cie10Result[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Search debounce
  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return }
    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/cie10?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results ?? [])
        setOpen(data.results?.length > 0)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  function select(code: string, description: string) {
    const formatted = `${code} - ${description}`
    onChange(formatted)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={ref} className="space-y-2">
      {/* Current value display */}
      {value && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl">
          <span className="font-mono text-xs font-bold text-primary">{value.split(' - ')[0]}</span>
          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">{value.split(' - ').slice(1).join(' - ')}</span>
          <button type="button" onClick={() => onChange('')} className="text-gray-400 hover:text-red-500 transition-colors text-xs flex-shrink-0">✕</button>
        </div>
      )}
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={value ? 'Cambiar diagnóstico...' : placeholder}
          className={`input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-slate-500 pr-8 ${className ?? ''}`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
            {results.map(r => (
              <button key={r.code} type="button"
                onClick={() => select(r.code, r.description)}
                className="w-full text-left px-4 py-2.5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-primary flex-shrink-0 w-14">{r.code}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{r.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
