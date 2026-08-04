import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "LegionHunt — Operating System",
  description: "LEGION team operating system",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen bg-[#07090d] antialiased">{children}</body>
    </html>
  )
}
