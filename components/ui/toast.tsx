"use client"

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react"

type ToastTone = "success" | "error" | "info"

type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = Date.now() + Math.random()

      setToasts((current) => [
        ...current,
        {
          id,
          message,
          tone,
        },
      ])

      window.setTimeout(() => {
        setToasts((current) =>
          current.filter((toast) => toast.id !== id),
        )
      }, 3500)
    },
    [],
  )

  function removeToast(id: number) {
    setToasts((current) =>
      current.filter((toast) => toast.id !== id),
    )
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => removeToast(toast.id)}
            className={[
              "pointer-events-auto rounded-2xl border px-4 py-3 text-left text-sm shadow-2xl backdrop-blur-xl transition",
              toast.tone === "success"
                ? "border-emerald-400/20 bg-emerald-950/90 text-emerald-100"
                : toast.tone === "error"
                  ? "border-rose-400/20 bg-rose-950/90 text-rose-100"
                  : "border-violet-400/20 bg-[#15121f]/95 text-violet-100",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5">
                {toast.tone === "success"
                  ? "✓"
                  : toast.tone === "error"
                    ? "!"
                    : "i"}
              </span>

              <span className="flex-1 leading-5">
                {toast.message}
              </span>

              <span className="text-white/30">×</span>
            </div>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error(
      "useToast должен использоваться внутри ToastProvider.",
    )
  }

  return context
}