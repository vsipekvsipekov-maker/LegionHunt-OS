import type { ReactNode } from "react"

import { CommandPalette } from "@/components/command/command-palette"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { requireUser } from "@/lib/auth"

export async function DashboardShell({
  children,
}: {
  children: ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.035),transparent_32%),linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]" />

      <Sidebar />
      <CommandPalette />

      <div className="relative min-w-0 lg:pl-[288px]">
        <Topbar
          user={{
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          }}
        />

        <main className="min-w-0 px-3 py-5 sm:px-7 sm:py-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}
