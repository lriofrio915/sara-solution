'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface KnowledgeDoc {
  id: string
  name: string
  size: number
  mimeType: string
  charCount: number
  createdAt: string
}

const ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'text/plain': '📃',
  'text/csv': '📊',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/webp': '🖼️',
}

const FORMATS = [
  { icon: '📄', label: 'PDF' },
  { icon: '📝', label: 'Word' },
  { icon: '📊', label: 'Excel' },
  { icon: '📃', label: 'TXT / CSV' },
  { icon: '🖼️', label: 'Imagen' },
]

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatChars(n: number): string {
  if (n === 0) return 'Sin texto extraído'
  if (n < 1000) return `${n} caracteres`
  return `${(n / 1000).toFixed(1)}k caracteres`
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingName, setUploadingName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      const data = await res.json()
      setDocs(data.documents ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los documentos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const uploadFile = async (file: File) => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError(`Tipo no soportado: ${file.name}`)
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError(`"${file.name}" supera el límite de 20 MB`)
      return
    }

    setUploading(true)
    setUploadingName(file.name)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/knowledge', { method: 'POST', body: formData })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Error ${res.status}`)
      }

      const data = await res.json()
      setDocs((prev) => [data.document, ...prev])
      setSuccess(`"${file.name}" subido y procesado correctamente`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo')
    } finally {
      setUploading(false)
      setUploadingName('')
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || uploading) return
    // Upload sequentially
    const arr = Array.from(files)
    arr.reduce((p, f) => p.then(() => uploadFile(f)), Promise.resolve())
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const deleteDoc = async (id: string, name: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error eliminando')
      setDocs((prev) => prev.filter((d) => d.id !== id))
      setSuccess(`"${name}" eliminado`)
    } catch {
      setError('No se pudo eliminar el documento')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Base de conocimiento</h1>
        <p className="text-gray-500 dark:text-slate-300 mt-1 text-sm">
          Sube tus guías clínicas, protocolos y documentos médicos. Sara los leerá como fuente de verdad al responder tus preguntas.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
          <span className="mt-0.5 flex-shrink-0">⚠️</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <span>✓</span>
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 mb-6 ${
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-700/30'
        } ${uploading ? 'opacity-60 cursor-wait' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.webp"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-primary font-semibold">Procesando: {uploadingName}</p>
            <p className="text-gray-400 text-xs">Extrayendo texto del documento...</p>
          </div>
        ) : (
          <>
            <div className="text-5xl mb-4">📂</div>
            <p className="text-gray-700 dark:text-gray-200 font-semibold text-lg">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-gray-400 dark:text-slate-400 text-sm mt-2">
              PDF, Word, Excel, TXT, CSV, Imágenes · Máximo 20 MB por archivo
            </p>
          </>
        )}
      </div>

      {/* Format chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {FORMATS.map((f) => (
          <div key={f.label}
            className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-600 dark:text-gray-300 shadow-sm">
            <span>{f.icon}</span>
            <span className="font-medium">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Documents list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Documentos subidos{' '}
            <span className="text-gray-400 font-normal text-sm">({docs.length})</span>
          </h2>
          {docs.length > 0 && (
            <p className="text-xs text-gray-400">
              {docs.reduce((acc, d) => acc + d.charCount, 0).toLocaleString()} caracteres totales indexados
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-center py-16">
            <div className="text-4xl mb-3">🗂️</div>
            <p className="text-gray-500 dark:text-slate-300 font-medium">No hay documentos aún</p>
            <p className="text-gray-400 dark:text-slate-400 text-sm mt-1">Sube el primero para que Sara pueda consultarlo</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {docs.map((doc, i) => (
              <div key={doc.id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i < docs.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''
                } hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors`}>

                <span className="text-2xl flex-shrink-0">{MIME_ICONS[doc.mimeType] ?? '📎'}</span>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{formatSize(doc.size)}</span>
                    <span className="text-gray-200 dark:text-gray-600">·</span>
                    <span className={`text-xs font-medium ${
                      doc.charCount > 100
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-orange-500 dark:text-orange-400'
                    }`}>
                      {doc.charCount > 100 ? '✓' : '⚠'} {formatChars(doc.charCount)}
                    </span>
                    <span className="text-gray-200 dark:text-gray-600">·</span>
                    <span className="text-xs text-gray-400">
                      {new Date(doc.createdAt).toLocaleDateString('es-EC')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => deleteDoc(doc.id, doc.name)}
                  disabled={deletingId === doc.id}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 flex-shrink-0"
                  title="Eliminar">
                  {deletingId === doc.id ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RAG explanation */}
      <div className="mt-6 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-5 space-y-2">
        <p className="text-sm font-semibold text-primary">¿Cómo funciona el RAG?</p>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Cuando preguntas algo a Sara, ella busca automáticamente en tus documentos los fragmentos más relevantes
          y los usa como contexto para responder. Esto le permite citar tus propios protocolos, guías y documentos.
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Ejemplo: <em>&ldquo;¿Cuál es el protocolo para hipertensión según mis guías?&rdquo;</em> → Sara buscará en tus documentos y citará el contenido relevante.
        </p>
      </div>
    </div>
  )
}
