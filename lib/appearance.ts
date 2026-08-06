"use client"

export type AccentName = "violet" | "blue" | "emerald" | "rose"

export type AppearanceSettings = {
  accent?: string
  compact?: boolean
  animations?: boolean
}

export const accentValues: Record<
  AccentName,
  {
    rgb: string
    solid: string
    soft: string
    palette: Record<number, string>
  }
> = {
  violet: {
    rgb: "139 92 246",
    solid: "#8b5cf6",
    soft: "rgba(139, 92, 246, 0.16)",
    palette: {
      50: "#f5f3ff",
      100: "#ede9fe",
      200: "#ddd6fe",
      300: "#c4b5fd",
      400: "#a78bfa",
      500: "#8b5cf6",
      600: "#7c3aed",
      700: "#6d28d9",
      800: "#5b21b6",
      900: "#4c1d95",
      950: "#2e1065",
    },
  },
  blue: {
    rgb: "59 130 246",
    solid: "#3b82f6",
    soft: "rgba(59, 130, 246, 0.16)",
    palette: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      950: "#172554",
    },
  },
  emerald: {
    rgb: "16 185 129",
    solid: "#10b981",
    soft: "rgba(16, 185, 129, 0.16)",
    palette: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10b981",
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
      950: "#022c22",
    },
  },
  rose: {
    rgb: "244 63 94",
    solid: "#f43f5e",
    soft: "rgba(244, 63, 94, 0.16)",
    palette: {
      50: "#fff1f2",
      100: "#ffe4e6",
      200: "#fecdd3",
      300: "#fda4af",
      400: "#fb7185",
      500: "#f43f5e",
      600: "#e11d48",
      700: "#be123c",
      800: "#9f1239",
      900: "#881337",
      950: "#4c0519",
    },
  },
}

function normalizeAccent(value?: string): AccentName {
  if (
    value === "blue" ||
    value === "emerald" ||
    value === "rose" ||
    value === "violet"
  ) {
    return value
  }

  return "violet"
}

export function applyAppearance(settings: AppearanceSettings) {
  const root = document.documentElement
  const accentName = normalizeAccent(settings.accent)
  const accent = accentValues[accentName]

  root.dataset.accent = accentName
  root.dataset.compact = String(settings.compact === true)
  root.dataset.animations = String(settings.animations !== false)

  root.style.setProperty("--lh-accent-rgb", accent.rgb)
  root.style.setProperty("--lh-accent", accent.solid)
  root.style.setProperty("--lh-accent-soft", accent.soft)

  for (const [shade, value] of Object.entries(accent.palette)) {
    root.style.setProperty(`--color-violet-${shade}`, value)
    root.style.setProperty(`--color-purple-${shade}`, value)
    root.style.setProperty(`--color-fuchsia-${shade}`, value)
  }

  root.classList.add("dark")
  root.style.colorScheme = "dark"

  try {
    window.localStorage.setItem(
      "legionhunt-appearance",
      JSON.stringify({
        accent: accentName,
        compact: settings.compact === true,
        animations: settings.animations !== false,
      }),
    )
  } catch {
    // localStorage may be unavailable in private browsing.
  }
}

export function readCachedAppearance(): AppearanceSettings | null {
  try {
    const raw = window.localStorage.getItem("legionhunt-appearance")

    if (!raw) {
      return null
    }

    return JSON.parse(raw) as AppearanceSettings
  } catch {
    return null
  }
}
