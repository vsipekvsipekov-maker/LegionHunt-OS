const data = [22, 30, 27, 41, 48, 52, 64, 71, 69, 82, 91, 103]
const labels = ["Сен", "Окт", "Ноя", "Дек", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг"]

export function GrowthChart() {
  const width = 760
  const height = 260
  const min = Math.min(...data)
  const max = Math.max(...data)
  const points = data.map((value, index) => {
    const x = 20 + (index / (data.length - 1)) * (width - 40)
    const y = height - 28 - ((value - min) / (max - min)) * (height - 70)
    return { x, y, value }
  })
  const line = points.map((point) => `${point.x},${point.y}`).join(" ")

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.028] p-5 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Рост команды</p>
          <p className="mt-1 text-xs text-white/28">Активные участники за 12 месяцев</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-white/[0.07] bg-white/[0.035] px-2.5 py-1.5 text-[10px] text-white/40">12 месяцев</span>
          <span className="rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-medium text-emerald-300">+38.6%</span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] min-w-[680px] w-full">
          <defs>
            <linearGradient id="growth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {[0, 1, 2, 3].map((row) => {
            const y = 30 + row * 56
            return <line key={row} x1="20" x2={width - 20} y1={y} y2={y} stroke="rgba(255,255,255,0.055)" strokeDasharray="4 7" />
          })}

          <polygon points={`20,${height - 28} ${line} ${width - 20},${height - 28}`} fill="url(#growth-fill)" />
          <polyline points={line} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

          {points.map((point, index) => (
            <g key={index}>
              <circle cx={point.x} cy={point.y} r="3.5" fill="#0b0d12" stroke="#c4b5fd" strokeWidth="2" />
              <text x={point.x} y={height - 8} fill="rgba(255,255,255,0.26)" fontSize="10" textAnchor="middle">{labels[index]}</text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  )
}
