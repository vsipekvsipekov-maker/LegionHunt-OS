import { ReactNode } from "react"

type StatCardProps = {
  title: string
  value: string | number
  icon?: ReactNode
  description?: string
  color?: "default" | "green" | "blue" | "violet" | "red"
}

const colors = {
  default: "border-white/10 bg-white/[0.03]",
  green: "border-emerald-400/20 bg-emerald-500/[0.06]",
  blue: "border-sky-400/20 bg-sky-500/[0.06]",
  violet: "border-violet-400/20 bg-violet-500/[0.06]",
  red: "border-rose-400/20 bg-rose-500/[0.06]",
}

export function StatCard({
  title,
  value,
  icon,
  description,
  color = "default",
}: StatCardProps) {
  return (
    <div
      className={`rounded-3xl border p-6 transition hover:scale-[1.01] ${colors[color]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/40">
            {title}
          </p>

          <h3 className="mt-2 text-3xl font-bold text-white">
            {value}
          </h3>

          {description && (
            <p className="mt-2 text-sm text-white/45">
              {description}
            </p>
          )}
        </div>

        {icon && (
          <div className="text-4xl opacity-80">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}