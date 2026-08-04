type SparklineProps = {
  values: number[]
  positive?: boolean
}

export function Sparkline({ values, positive = true }: SparklineProps) {
  const width = 160
  const height = 44
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 6) - 3
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-11 w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`fill-${positive ? "good" : "bad"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? "#8b5cf6" : "#fb7185"} stopOpacity="0.28" />
          <stop offset="100%" stopColor={positive ? "#8b5cf6" : "#fb7185"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={positive ? "#a78bfa" : "#fb7185"} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#fill-${positive ? "good" : "bad"})`} />
    </svg>
  )
}
