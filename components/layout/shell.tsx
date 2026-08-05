"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { CommandPalette } from "@/components/command/command-palette"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!mobileMenuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [mobileMenuOpen])

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.035),transparent_32%),linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]" />

      <Sidebar />
      <Sidebar mobile open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <CommandPalette />

      <div className="relative min-w-0 lg:pl-[288px]">
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="min-w-0 px-3 py-4 sm:px-5 sm:py-6 md:px-7 md:py-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}
