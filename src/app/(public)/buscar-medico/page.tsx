'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import SaraLogo from '@/components/SaraLogo'

interface DoctorResult {
  id: string
  name: string
  specialty: string
  bio: string | null
  avatarUrl: string | null
  address: string | null
  schedules: string | null
  whatsapp: string | null
  slug: string
}

export default function BuscarMedicoPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DoctorResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)

    try {
      const res = await fetch(`/api/buscar-medico?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      setResults(data.doctors ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <SaraLogo size="sm" />
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            Soy médico →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-teal-200">
            <span>🔍</span> Buscar médico
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Encuentra a tu médico
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Busca por nombre o especialidad y agenda tu cita con Sara, el asistente IA de tu médico.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-12">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre del médico o especialidad..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-2xl shadow-sm transition-colors disabled:opacity-60 text-sm"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </form>

        {/* Results */}
        {searched && !loading && (
          results.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-medium text-gray-600">No encontramos médicos con esa búsqueda</p>
              <p className="text-sm mt-1">Intenta con otro nombre o especialidad</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {doc.avatarUrl ? (
                      <Image
                        src={doc.avatarUrl}
                        alt={doc.name}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {doc.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{doc.name}</h3>
                      <p className="text-primary text-sm font-medium">{doc.specialty}</p>
                      {doc.address && (
                        <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                          <span>📍</span> {doc.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {doc.bio && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{doc.bio}</p>
                  )}

                  {doc.schedules && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                        <span>🕐</span> Horarios
                      </p>
                      <p className="text-gray-500 text-xs whitespace-pre-line">{doc.schedules}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      href={`/portal?email=`}
                      className="flex-1 text-center py-2.5 bg-primary/5 hover:bg-primary/10 text-primary font-semibold rounded-xl text-sm transition-colors"
                    >
                      📅 Ver mis citas
                    </Link>
                    {doc.whatsapp && (
                      <a
                        href={`https://wa.me/${doc.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${doc.name}, me gustaría agendar una cita.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-semibold rounded-xl text-sm transition-colors"
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* No search yet */}
        {!searched && (
          <div className="text-center py-8">
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              {['Medicina Interna', 'Cardiología', 'Pediatría'].map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => { setQuery(spec); }}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors shadow-sm"
                >
                  {spec}
                </button>
              ))}
            </div>
            <p className="text-gray-400 text-sm mt-4">O escribe en el buscador</p>
          </div>
        )}
      </main>
    </div>
  )
}
