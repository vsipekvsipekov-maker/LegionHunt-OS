import type { ReactNode } from "react"
import { Sparkline } from "@/components/dashboard/sparkline"

type MetricCardProps = {
  title: string
  value: string
  change: string
  note: string
  icon: ReactNode
  values: number[]
}

export function MetricCard({ title, value, change, note, icon, values }: MetricCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.045]">
      <div className="absolute -right-12 -top-12 size-36 rounded-full bg-violet-500/[0.055] blur-3xl transition group-hover:bg-violet-500/[0.1]" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/35">{title}</p>
          <p className="mt-2.5 text-[31px] font-semibold tracking-[-0.045em] text-white">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-violet-300">{icon}</div>
      </div>
      <div className="relative mt-3">
        <Sparkline values={values} />
      </div>
      <div className="relative mt-1 flex items-center gap-2 text-xs">
        <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 font-semibold text-emerald-300">{change}</span>
        <span className="text-white/25">{note}</span>
      </div>
    </article>
  )
}
