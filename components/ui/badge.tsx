import type { ReactNode } from "react"

type BadgeTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "blue"

type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

const tones: Record<BadgeTone, string> = {
  default: "border-white/10 bg-white/[0.04] text-white/55",
  success:
    "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300",
  warning:
    "border-amber-400/20 bg-amber-400/[0.08] text-amber-300",
  danger:
    "border-rose-400/20 bg-rose-400/[0.08] text-rose-300",
  violet:
    "border-violet-400/20 bg-violet-400/[0.08] text-violet-300",
  blue:
    "border-sky-400/20 bg-sky-400/[0.08] text-sky-300",
}

export function Badge({
  children,
  tone = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold",
        tones[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  )
}