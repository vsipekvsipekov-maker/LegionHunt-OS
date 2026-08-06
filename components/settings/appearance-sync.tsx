"use client"

import { useEffect } from "react"

import {
  applyAppearance,
  readCachedAppearance,
} from "@/lib/appearance"

export function AppearanceSync() {
  useEffect(() => {
    const cached = readCachedAppearance()

    if (cached) {
      applyAppearance(cached)
    }

    let cancelled = false

    async function syncAppearance() {
      try {
        const response = await fetch("/api/settings", {
          cache: "no-store",
        })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as {
          settings?: {
            accent?: string
            compact?: boolean
            animations?: boolean
          }
        }

        if (!cancelled && payload.settings) {
          applyAppearance(payload.settings)
        }
      } catch {
        // Public pages and temporary network failures keep the cached/default accent.
      }
    }

    void syncAppearance()

    function handleAppearanceChange(event: Event) {
      const customEvent = event as CustomEvent<{
        accent?: string
        compact?: boolean
        animations?: boolean
      }>

      if (customEvent.detail) {
        applyAppearance(customEvent.detail)
      }
    }

    window.addEventListener(
      "legionhunt:appearance-change",
      handleAppearanceChange,
    )

    return () => {
      cancelled = true
      window.removeEventListener(
        "legionhunt:appearance-change",
        handleAppearanceChange,
      )
    }
  }, [])

  return null
}
