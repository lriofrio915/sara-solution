'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface SurveyData {
  answered: boolean
  doctor: { name: string; specialty: string; avatarUrl: string | null }
  appointmentDate: string | null
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  const labels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente']
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill={(hover || value) >= star ? '#F59E0B' : 'none'}
              stroke={(hover || value) >= star ? '#F59E0B' : '#D1D5DB'}
              strokeWidth="1.5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <p className="text-sm font-semibold text-amber-600">{labels[hover || value]}</p>
      )}
    </div>
  )
}

export default function SurveyPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/public/survey/${token}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then((d) => { if (d) setData(d) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (score === 0) { setError('Por favor selecciona una calificación'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/survey/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment: comment || null, wouldRecommend }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Encuesta no encontrada</h1>
        <p className="text-gray-500">Este enlace no es válido o ha expirado.</p>
      </div>
    </div>
  )

  if (!data) return null

  if (data.answered || submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-50 p-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-5">
          🎉
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">¡Gracias por tu opinión!</h1>
        <p className="text-gray-500 mb-6">
          Tu calificación nos ayuda a mejorar el servicio del consultorio de{' '}
          <strong>{data.doctor.name}</strong>.
        </p>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex justify-center gap-1 mb-1">
            {[1,2,3,4,5].map((s) => (
              <svg key={s} width="20" height="20" viewBox="0 0 24 24"
                fill={s <= score ? '#F59E0B' : '#E5E7EB'} stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
          <p className="text-xs text-gray-400">Tu calificación ha sido registrada</p>
        </div>
      </div>
    </div>
  )

  const formattedDate = data.appointmentDate
    ? new Date(data.appointmentDate).toLocaleDateString('es-EC', { dateStyle: 'long' })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2563EB, #0D9488)' }}
          >
            S
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">¿Cómo fue tu atención?</h1>
          <p className="text-gray-500 text-sm">
            Con <strong>{data.doctor.name}</strong>
            {formattedDate && <> · {formattedDate}</>}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-6">
          {/* Stars */}
          <div>
            <p className="text-sm font-semibold text-gray-700 text-center mb-4">
              Califica la atención recibida
            </p>
            <StarRating value={score} onChange={setScore} />
          </div>

          {/* Would recommend */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">
              ¿Recomendarías a {data.doctor.name} con un familiar o amigo?
            </p>
            <div className="flex gap-3">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setWouldRecommend(val)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    wouldRecommend === val
                      ? val
                        ? 'border-green-400 bg-green-50 text-green-700'
                        : 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {val ? '👍 Sí' : '👎 No'}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Comentario (opcional)
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              placeholder="Cuéntanos más sobre tu experiencia..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || score === 0}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-60 transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #2563EB, #0D9488)' }}
          >
            {submitting ? 'Enviando...' : 'Enviar calificación'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Tus respuestas son confidenciales y solo visibles para el médico.
        </p>
      </div>
    </div>
  )
}
