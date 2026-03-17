'use client'

export interface DonutSlice {
  label: string
  value: number
  color: string
}

interface Props {
  data: DonutSlice[]
  size?: number
}

export default function DonutChart({ data, size = 110 }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return (
    <div className="flex items-center justify-center h-16 text-gray-400 text-xs">Sin datos</div>
  )

  const r = 38
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const gap = 0.015 // small gap between slices (radians)

  let cumulativeAngle = -Math.PI / 2 // start from top

  const slices = data
    .filter(d => d.value > 0)
    .map(d => {
      const angle = (d.value / total) * (2 * Math.PI) - gap
      const startAngle = cumulativeAngle + gap / 2
      const endAngle = startAngle + angle
      cumulativeAngle += (d.value / total) * (2 * Math.PI)

      const x1 = cx + r * Math.cos(startAngle)
      const y1 = cy + r * Math.sin(startAngle)
      const x2 = cx + r * Math.cos(endAngle)
      const y2 = cy + r * Math.sin(endAngle)
      const largeArc = angle > Math.PI ? 1 : 0

      return {
        ...d,
        path: `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
        pct: Math.round((d.value / total) * 100),
      }
    })

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={r + 4} fill="transparent" />
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} opacity="0.9" />
          ))}
          {/* Center hole */}
          <circle cx={cx} cy={cy} r={r * 0.55} fill="white" className="dark:hidden" />
          <circle cx={cx} cy={cy} r={r * 0.55} fill="#1f2937" className="hidden dark:block" />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#374151">
            {total}
          </text>
        </svg>
      </div>
      <div className="w-full space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 dark:text-slate-300 flex-1 truncate">{s.label}</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{s.value}</span>
            <span className="text-gray-400 w-8 text-right">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
