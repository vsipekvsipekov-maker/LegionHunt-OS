import type { ReactNode } from "react"

type SectionTitleProps = {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: SectionTitleProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
          {title}
        </h2>

        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}