import { ReactNode } from "react"

type EmptyStateProps = {
  title: string
  description: string
  icon?: ReactNode
}

export function EmptyState({
  title,
  description,
  icon,
}: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
      <div className="mb-4 flex justify-center text-5xl">
        {icon ?? "📭"}
      </div>

      <h3 className="text-xl font-semibold text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm text-white/45">
        {description}
      </p>
    </div>
  )
}