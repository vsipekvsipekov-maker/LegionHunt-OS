"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  AutomationIcon,
  BookIcon,
  BrainIcon,
  CalendarIcon,
  ChartIcon,
  GraduationIcon,
  GridIcon,
  SettingsIcon,
  TeamIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons"

const groups = [
  {
    label: "Главное",
    items: [
      { label: "Dashboard", icon: GridIcon, href: "/" },
      { label: "AI Center", icon: BrainIcon, href: "/ai", meta: "AI" },
      { label: "CRM", icon: UsersIcon, href: "/crm" },
      { label: "Wiki", icon: BookIcon, href: "/wiki" },
      { label: "Academy", icon: GraduationIcon, href: "/academy" },
    ],
  },
  {
    label: "Управление",
    items: [
      { label: "Analytics", icon: ChartIcon, href: "/analytics" },
      { label: "Automation", icon: AutomationIcon, href: "/workflows" },
      { label: "Finance", icon: WalletIcon, href: "/finance" },
      { label: "Team", icon: TeamIcon, href: "/team" },
      { label: "Calendar", icon: CalendarIcon, href: "/calendar" },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 hidden border-r border-white/8 bg-[#080808]/96 backdrop-blur-2xl lg:flex lg:flex-col",
        "transition-[width] duration-300",
        collapsed ? "w-[92px]" : "w-[288px]",
      ].join(" ")}
    >
      <div className="flex h-20 items-center border-b border-white/8 px-5">
        <Link href="/" className="flex min-w-0 items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white text-[11px] font-black tracking-[-0.08em] text-black shadow-[0_12px_32px_rgba(255,255,255,0.08)]">
            LH
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.03em] text-white">LegionHunt</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/35">Operating System</p>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6">
        {groups.map((group, groupIndex) => (
          <div key={group.label} className={groupIndex ? "mt-8" : ""}>
            {!collapsed && (
              <p className="mb-2.5 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">
                {group.label}
              </p>
            )}
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={[
                      "group relative flex h-12 items-center rounded-2xl text-[15px] font-medium transition-all",
                      collapsed ? "justify-center" : "gap-3.5 px-3.5",
                      active
                        ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.08)]"
                        : "text-white/52 hover:bg-white/6 hover:text-white",
                    ].join(" ")}
                  >
                    <Icon className="size-[19px] shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.meta && (
                          <span className={active ? "rounded-md bg-black/8 px-1.5 py-0.5 text-[9px] text-black/55" : "rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-white/42"}>
                            {item.meta}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 p-3">
        <Link
          href="/settings"
          className={[
            "flex h-12 items-center rounded-2xl text-[15px] font-medium transition-all",
            collapsed ? "justify-center" : "gap-3.5 px-3.5",
            pathname === "/settings" ? "bg-white text-black" : "text-white/52 hover:bg-white/6 hover:text-white",
          ].join(" ")}
        >
          <SettingsIcon className="size-[19px]" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="mt-2 flex h-10 w-full items-center justify-center rounded-xl border border-white/8 bg-white/[0.025] text-xs text-white/38 transition hover:bg-white/7 hover:text-white"
        >
          {collapsed ? "→" : "Свернуть меню"}
        </button>
      </div>
    </aside>
  )
}
