type FunnelStage = {
  key: string
  label: string
  value: number
}

type DailyPoint = {
  label: string
  value: number
}

export function CrmFunnelChart({
  stages,
  dailyGrowth,
}: {
  stages: FunnelStage[]
  dailyGrowth: DailyPoint[]
}) {
  const maxStage = Math.max(...stages.map((stage) => stage.value), 1)
  const maxDaily = Math.max(...dailyGrowth.map((point) => point.value), 1)

  return (
    <div className="mt-7">
      <div className="space-y-4">
        {stages.map((stage) => {
          const width = Math.max((stage.value / maxStage) * 100, stage.value ? 8 : 0)

          return (
            <div key={stage.key}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="text-sm text-white/48">{stage.label}</p>
                <p className="text-sm font-semibold text-white">{stage.value}</p>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.055]">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-500"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 border-t border-white/[0.07] pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white/55">
            Новые кандидаты за 7 дней
          </p>
          <p className="text-xs text-white/25">
            Всего: {dailyGrowth.reduce((sum, point) => sum + point.value, 0)}
          </p>
        </div>

        <div className="mt-5 flex h-32 items-end gap-2">
          {dailyGrowth.map((point) => {
            const height = Math.max((point.value / maxDaily) * 100, point.value ? 10 : 3)

            return (
              <div
                key={point.label}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[10px] text-white/28">{point.value}</span>
                <div
                  className="w-full max-w-10 rounded-t-lg bg-white/75 transition-[height] duration-500"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[9px] text-white/22">{point.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
