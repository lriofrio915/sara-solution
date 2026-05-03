'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Trivia database ──────────────────────────────────────────────────────────

interface TriviaQuestion {
  q: string
  options: string[]
  answer: number // index of correct option
  fact: string
}

const TRIVIA: TriviaQuestion[] = [
  {
    q: '¿Cuántos huesos tiene el cuerpo humano adulto?',
    options: ['106', '156', '206', '256'],
    answer: 2,
    fact: 'Los bebés nacen con ~270 huesos, pero muchos se fusionan durante el crecimiento.',
  },
  {
    q: '¿Cuál es el órgano más grande del cuerpo humano?',
    options: ['Hígado', 'Pulmón', 'Intestino delgado', 'Piel'],
    answer: 3,
    fact: 'La piel adulta cubre ~2 m² y pesa entre 3 y 4 kg.',
  },
  {
    q: '¿Cuántas veces late el corazón en un día promedio?',
    options: ['~10,000', '~50,000', '~100,000', '~200,000'],
    answer: 2,
    fact: 'Eso equivale a bombear unos 7,500 litros de sangre cada 24 horas.',
  },
  {
    q: '¿Qué porcentaje del oxígeno consumido usa el cerebro?',
    options: ['5%', '10%', '20%', '35%'],
    answer: 2,
    fact: 'El cerebro pesa solo el 2% del cuerpo pero consume el 20% del oxígeno total.',
  },
  {
    q: '¿Cuál es el tejido más duro del cuerpo humano?',
    options: ['Hueso cortical', 'Esmalte dental', 'Cartílago articular', 'Uña'],
    answer: 1,
    fact: 'El esmalte es 96% mineral (hidroxiapatita), más duro que cualquier hueso.',
  },
  {
    q: '¿Cuántos alvéolos tienen los pulmones aproximadamente?',
    options: ['30 millones', '300 millones', '3,000 millones', '30,000 millones'],
    answer: 1,
    fact: 'La superficie total de intercambio gaseoso equivale a ~70 m² — el tamaño de un apartamento.',
  },
  {
    q: '¿En cuánto tiempo se renueva completamente la piel humana?',
    options: ['~1 semana', '~2 semanas', '~4 semanas', '~3 meses'],
    answer: 2,
    fact: 'Perdemos entre 30,000 y 40,000 células de piel por hora — ¡casi un millón al día!',
  },
  {
    q: '¿Cuántos colores puede distinguir el ojo humano?',
    options: ['~10,000', '~1 millón', '~10 millones', '~100 millones'],
    answer: 2,
    fact: 'Los conos de la retina (6–7 millones) detectan longitudes de onda del espectro visible.',
  },
  {
    q: '¿Cuántos litros de sangre tiene un adulto promedio?',
    options: ['2–3 L', '4–6 L', '7–9 L', '10–12 L'],
    answer: 1,
    fact: 'El volumen sanguíneo equivale al 7–8% del peso corporal total.',
  },
  {
    q: '¿Qué parte del cuerpo continúa creciendo toda la vida?',
    options: ['Cerebro', 'Nariz y orejas', 'Córneas', 'Tendones'],
    answer: 1,
    fact: 'El cartílago de nariz y orejas sigue creciendo lentamente por gravedad y peso con los años.',
  },
]

// ─── EKG path (simplified heartbeat waveform) ────────────────────────────────

const EKG_PATH =
  'M0,30 L18,30 L22,25 L26,30 L30,30 L36,5 L42,55 L48,30 L56,20 L64,30 L72,30 L200,30'

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  label?: string
}

export default function MedicalLoadingScreen({ label = 'Cargando...' }: Props) {
  const [qIdx] = useState(() => Math.floor(Math.random() * TRIVIA.length))
  const trivia = TRIVIA[qIdx]

  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [ekgOffset, setEkgOffset] = useState(200)
  const ekgRef = useRef<SVGPathElement>(null)

  // EKG animation: repeatedly sweep the line
  useEffect(() => {
    let frame: number
    let start: number | null = null
    const duration = 1800 // ms per cycle

    function animate(ts: number) {
      if (start === null) start = ts
      const elapsed = (ts - start) % duration
      const progress = elapsed / duration
      const pathLen = 200
      setEkgOffset(pathLen - progress * pathLen)
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  function handleSelect(idx: number) {
    if (revealed) return
    setSelected(idx)
    setRevealed(true)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[380px] px-4 py-10 select-none">

      {/* EKG animation */}
      <div className="mb-6">
        <svg
          viewBox="0 0 200 60"
          width="200"
          height="60"
          className="overflow-visible"
          aria-hidden="true"
        >
          {/* trail (gray) */}
          <path
            d={EKG_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* animated line (primary color) */}
          <path
            ref={ekgRef}
            d={EKG_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-primary"
            strokeDasharray="200"
            strokeDashoffset={ekgOffset}
            style={{ transition: 'stroke-dashoffset 16ms linear' }}
          />
        </svg>
      </div>

      {/* Trivia card */}
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
            🧠 Mientras cargamos…
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white leading-snug">
            {trivia.q}
          </p>
        </div>

        <div className="px-5 py-3 grid grid-cols-2 gap-2">
          {trivia.options.map((opt, i) => {
            const isCorrect = i === trivia.answer
            const isSelected = selected === i
            let cls =
              'text-xs font-medium px-3 py-2 rounded-xl border transition-all duration-200 text-left '

            if (!revealed) {
              cls += isSelected
                ? 'bg-primary text-white border-primary'
                : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary/50 cursor-pointer'
            } else if (isCorrect) {
              cls += 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600 text-green-700 dark:text-green-400'
            } else if (isSelected && !isCorrect) {
              cls += 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400'
            } else {
              cls += 'border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500'
            }

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                disabled={revealed}
                className={cls}
              >
                {revealed && isCorrect && <span className="mr-1">✓</span>}
                {revealed && isSelected && !isCorrect && <span className="mr-1">✗</span>}
                {opt}
              </button>
            )
          })}
        </div>

        {revealed && (
          <div className="px-5 pb-4">
            <p className="text-xs text-gray-500 dark:text-slate-400 italic leading-relaxed">
              💡 {trivia.fact}
            </p>
          </div>
        )}

        {!revealed && (
          <p className="px-5 pb-3 text-[10px] text-gray-400 dark:text-slate-500 italic">
            Toca una opción para responder
          </p>
        )}
      </div>

      {/* Loading label */}
      <div className="mt-5 flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        {label}
      </div>
    </div>
  )
}
