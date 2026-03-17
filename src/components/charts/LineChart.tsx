'use client'

export interface LineChartItem {
  label: string
  value: number
}

interface Props {
  data: LineChartItem[]
  color?: string
  className?: string
}

const SVG_W = 300
const SVG_H = 120
const PAD = { top: 16, bottom: 28, left: 8, right: 8 }
const PLOT_H = SVG_H - PAD.top - PAD.bottom
const PLOT_W = SVG_W - PAD.left - PAD.right

export default function LineChart({ data, color = '#0D9488', className = '' }: Props) {
  if (data.length < 2) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const n = data.length
  const gradId = `la-${color.replace('#', '')}`

  const pts = data.map((d, i) => ({
    x: PAD.left + (i / (n - 1)) * PLOT_W,
    y: PAD.top + PLOT_H - (d.value / max) * PLOT_H,
    label: d.label,
    value: d.value,
  }))

  // Smooth bezier
  const linePath = pts.map((p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    const prev = pts[i - 1]
    const cpx = ((prev.x + p.x) / 2).toFixed(1)
    return `C ${cpx} ${prev.y.toFixed(1)}, ${cpx} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  }).join(' ')

  const areaPath = `${linePath} L ${pts[n - 1].x.toFixed(1)} ${(PAD.top + PLOT_H).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PAD.top + PLOT_H).toFixed(1)} Z`

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: SVG_H }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.5, 1].map(pct => (
          <line key={pct}
            x1={PAD.left} x2={SVG_W - PAD.right}
            y1={PAD.top + PLOT_H * (1 - pct)} y2={PAD.top + PLOT_H * (1 - pct)}
            stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray={pct > 0 ? '4,4' : ''} />
        ))}

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke={color} strokeWidth="2" />
            {p.value > 0 && (
              <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="8.5" fill={color} fontWeight="700">
                {p.value}
              </text>
            )}
            <text x={p.x} y={SVG_H - 5} textAnchor="middle" fontSize="9" fill="#9ca3af">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
