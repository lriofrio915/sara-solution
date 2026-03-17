'use client'

export interface BarChartItem {
  label: string
  value: number
}

interface Props {
  data: BarChartItem[]
  color?: string
  className?: string
}

const SVG_W = 300
const SVG_H = 140
const PAD = { top: 24, bottom: 32, left: 8, right: 8 }
const PLOT_H = SVG_H - PAD.top - PAD.bottom
const PLOT_W = SVG_W - PAD.left - PAD.right

export default function BarChart({ data, color = '#2563EB', className = '' }: Props) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const n = data.length
  const slotW = PLOT_W / n
  const barW = Math.min(slotW * 0.55, 28)

  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: SVG_H }}>
        <defs>
          <linearGradient id={`bg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((pct) => (
          <line
            key={pct}
            x1={PAD.left} x2={SVG_W - PAD.right}
            y1={PAD.top + PLOT_H * (1 - pct)}
            y2={PAD.top + PLOT_H * (1 - pct)}
            stroke="#e5e7eb" strokeWidth="0.5"
            strokeDasharray={pct > 0 ? '4,4' : ''}
          />
        ))}

        {data.map((d, i) => {
          const barH = Math.max((d.value / max) * PLOT_H, d.value > 0 ? 3 : 0)
          const x = PAD.left + i * slotW + (slotW - barW) / 2
          const y = PAD.top + PLOT_H - barH

          return (
            <g key={i}>
              <rect
                x={x} y={y} width={barW} height={barH}
                fill={`url(#bg-${color.replace('#', '')})`} rx="3"
              />
              {d.value > 0 && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle"
                  fontSize="8.5" fill={color} fontWeight="700">
                  {d.value}
                </text>
              )}
              <text x={x + barW / 2} y={SVG_H - 6} textAnchor="middle"
                fontSize="9" fill="#9ca3af">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
