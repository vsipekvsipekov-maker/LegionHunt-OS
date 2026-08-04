import type { ReactNode } from "react"

type StatCardProps = {
  title: string
  value: string
  change: string
  positive?: boolean
  icon: ReactNode
  note: string
}

export function StatCard({
  title,
  value,
  change,
  positive = true,
  icon,
  note,
}: StatCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.05]">
      <div className="absolute -right-8 -top-8 size-28 rounded-full bg-violet-500/[0.06] blur-2xl transition group-hover:bg-violet-500/[0.12]" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-white/40">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.045] text-violet-300">
          {icon}
        </div>
      </div>

      <div className="relative mt-5 flex items-center gap-2 text-xs">
        <span
          className={[
            "rounded-md px-1.5 py-0.5 font-semibold",
            positive
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-rose-400/10 text-rose-300",
          ].join(" ")}
        >
          {change}
        </span>
        <span className="text-white/30">{note}</span>
      </div>
    </article>
  )
}
