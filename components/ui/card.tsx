import { ReactNode } from "react"

type CardProps = {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function Card({
  title,
  subtitle,
  children,
  className = "",
}: CardProps) {
  return (
    <section
      className={`rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 shadow-lg ${className}`}
    >
      {(title || subtitle) && (
        <header className="mb-5">
          {title && (
            <h2 className="text-xl font-semibold text-white">
              {title}
            </h2>
          )}

          {subtitle && (
            <p className="mt-1 text-sm text-white/50">
              {subtitle}
            </p>
          )}
        </header>
      )}

      {children}
    </section>
  )
}