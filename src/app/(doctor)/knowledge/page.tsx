'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export const dynamic = 'force-dynamic'

interface KnowledgeDoc {
  id: string
  name: string
  size: number
  mimeType: string
  createdAt: string
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'text/plain': '📃',
  'text/csv': '📊',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function extractTextFromFile(file: File): Promise<string> {
  // For plain text files, read directly
  if (file.type === 'text/plain' || file.type === 'text/csv') {
    return file.text()
  }
  // For other types, return placeholder — server-side extraction needed for binary formats
  return `[Documento: ${file.name}]\n[Tipo: ${file.type}]\n[Tamaño: ${formatSize(file.size)}]\n\nEste documento fue subido para consulta de Sara. El contenido completo está disponible en el archivo almacenado.`
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge')
      if (!res.ok) throw new Error('Error cargando documentos')
      const data = await res.json()
      setDocs(data.documents ?? [])
    } catch (err) {
      setError('No se pudieron cargar los documentos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  const uploadFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Tipo de archivo no soportado: ${file.name}. Usa PDF, Word, Excel o TXT.`)
      return
    }

    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setError(`El archivo ${file.name} supera el límite de 10 MB`)
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const textContent = await extractTextFromFile(file)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('textContent', textContent)

      const res = await fetch('/api/knowledge', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Error ${res.status}`)
      }

      const data = await res.json()
      setDocs((prev) => [data.document, ...prev])
      setSuccess(`"${file.name}" subido exitosamente`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || uploading) return
    Array.from(files).forEach((f) => uploadFile(f))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const deleteDoc = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return

    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error eliminando')
      setDocs((prev) => prev.filter((d) => d.id !== id))
      setSuccess(`"${name}" eliminado`)
    } catch {
      setError('No se pudo eliminar el documento')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📚 Base de conocimiento</h1>
        <p className="text-gray-500 mt-1">
          Sube documentos médicos y Sara los usará como referencia al responder tus preguntas.
        </p>
      </div>

      {/* Alert */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <span>✓</span>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 mb-8 ${
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
        } ${uploading ? 'opacity-60 cursor-wait' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-primary font-medium">Subiendo documento...</p>
          </div>
        ) : (
          <>
            <div className="text-5xl mb-4">📂</div>
            <p className="text-gray-700 font-semibold text-lg">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-gray-400 text-sm mt-2">
              PDF, Word, Excel, TXT · Máximo 10 MB por archivo
            </p>
          </>
        )}
      </div>

      {/* Supported formats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        {[
          { icon: '📄', label: 'PDF' },
          { icon: '📝', label: 'Word' },
          { icon: '📊', label: 'Excel' },
          { icon: '📃', label: 'TXT' },
          { icon: '📊', label: 'CSV' },
          { icon: '📝', label: '.docx' },
        ].map((f) => (
          <div
            key={f.label}
            className="flex flex-col items-center gap-1 bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm"
          >
            <span className="text-2xl">{f.icon}</span>
            <span className="text-xs text-gray-500 font-medium">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Documents list */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-4">
          Documentos subidos{' '}
          <span className="text-gray-400 font-normal text-sm">({docs.length})</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🗂️</div>
            <p>No hay documentos aún. Sube el primero.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow transition-shadow"
              >
                <span className="text-2xl flex-shrink-0">
                  {MIME_ICONS[doc.mimeType] ?? '📎'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString('es-EC')}
                  </p>
                </div>
                <button
                  onClick={() => deleteDoc(doc.id, doc.name)}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"
                  title="Eliminar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage tip */}
      <div className="mt-8 bg-primary/5 border border-primary/20 rounded-xl p-5">
        <p className="text-sm text-primary font-semibold mb-1">💡 ¿Cómo usa Sara estos documentos?</p>
        <p className="text-sm text-gray-600">
          Cuando le preguntes algo a Sara, ella buscará en tus documentos para darte respuestas más
          precisas y personalizadas. Por ejemplo: &quot;¿Cuál es el protocolo para diabetes tipo 2
          según mis guías?&quot;
        </p>
      </div>
    </div>
  )
}
