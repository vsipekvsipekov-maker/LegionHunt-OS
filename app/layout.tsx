import type { Metadata } from "next"
import "./globals.css"

import { AppearanceSync } from "@/components/settings/appearance-sync"
import { ToastProvider } from "@/components/ui/toast"

export const metadata: Metadata = {
  title: "LegionHunt — Operating System",
  description: "LEGION team operating system",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen bg-[#07090d] antialiased">
        <AppearanceSync />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}