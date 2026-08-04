"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, BookOpen, Bot, CalendarDays, CheckCheck, GraduationCap, Loader2, RefreshCw, Users, UserRoundSearch, X } from "lucide-react"

type NotificationItem = {
  key: string
  module: "crm" | "academy" | "wiki" | "team" | "ai" | "calendar"
  title: string
  description: string
  href: string
  created_at: string
  priority: "high" | "normal" | "low"
  is_read: boolean
}

const moduleMeta = {
  crm: { label: "CRM", icon: UserRoundSearch, className: "bg-blue-400/10 text-blue-300" },
  academy: { label: "Academy", icon: GraduationCap, className: "bg-amber-400/10 text-amber-300" },
  wiki: { label: "Wiki", icon: BookOpen, className: "bg-violet-400/10 text-violet-300" },
  team: { label: "Team", icon: Users, className: "bg-emerald-400/10 text-emerald-300" },
  ai: { label: "AI", icon: Bot, className: "bg-fuchsia-400/10 text-fuchsia-300" },
  calendar: { label: "Calendar", icon: CalendarDays, className: "bg-blue-400/10 text-blue-300" },
} as const

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return "только что"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  return `${days} дн назад`
}

export function NotificationsCenter() {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState("")

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/notifications?limit=40", { cache: "no-store" })
      if (!response.ok) throw new Error("load failed")
      const data = (await response.json()) as { notifications: NotificationItem[]; unreadCount: number }
      setItems(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      setError("Не удалось загрузить уведомления")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(() => void load(true), 0)
    const timer = window.setInterval(() => void load(true), 60_000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [load])

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (open && rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function closeEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", closeOutside)
    document.addEventListener("keydown", closeEscape)
    return () => {
      document.removeEventListener("mousedown", closeOutside)
      document.removeEventListener("keydown", closeEscape)
    }
  }, [open])

  async function markRead(keys: string[]) {
    if (!keys.length) return
    setItems((current) => current.map((item) => keys.includes(item.key) ? { ...item, is_read: true } : item))
    setUnreadCount((count) => Math.max(0, count - keys.filter((key) => items.some((item) => item.key === key && !item.is_read)).length))
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
    }).catch(() => undefined)
  }

  async function markAll() {
    const unreadKeys = items.filter((item) => !item.is_read).map((item) => item.key)
    if (!unreadKeys.length) return
    setItems((current) => current.map((item) => ({ ...item, is_read: true })))
    setUnreadCount(0)
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => undefined)
  }

  function openItem(item: NotificationItem) {
    if (!item.is_read) void markRead([item.key])
    setOpen(false)
    router.push(item.href)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Открыть уведомления"
        onClick={() => {
          setOpen((value) => !value)
          if (!open) void load()
        }}
        className="relative flex size-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/45 transition hover:bg-white/[0.065] hover:text-white"
      >
        <Bell className="size-[18px]" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-[18px] text-white ring-2 ring-[#090b10]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-13 z-50 w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0d1017]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.065] px-4 py-3.5">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-violet-300" />
                <h2 className="text-sm font-semibold text-white">Уведомления</h2>
                {unreadCount > 0 && <span className="rounded-full bg-violet-400/12 px-2 py-0.5 text-[10px] font-medium text-violet-200">{unreadCount} новых</span>}
              </div>
              <p className="mt-0.5 text-[10px] text-white/30">События всех модулей LegionHunt</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => void load()} title="Обновить" className="rounded-lg p-2 text-white/35 transition hover:bg-white/[0.06] hover:text-white">
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/35 transition hover:bg-white/[0.06] hover:text-white">
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/25">Последние 30 дней</span>
            <button type="button" onClick={() => void markAll()} disabled={unreadCount === 0} className="flex items-center gap-1.5 text-[11px] text-violet-300 transition hover:text-violet-200 disabled:cursor-default disabled:text-white/20">
              <CheckCheck className="size-3.5" /> Все прочитано
            </button>
          </div>

          <div className="max-h-[540px] overflow-y-auto p-2">
            {loading && items.length === 0 ? (
              <div className="flex h-44 items-center justify-center text-white/30"><Loader2 className="size-5 animate-spin" /></div>
            ) : error ? (
              <div className="flex h-44 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-rose-300">{error}</p>
                <button onClick={() => void load()} className="text-xs text-violet-300">Повторить</button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-44 flex-col items-center justify-center text-center">
                <Bell className="mb-3 size-7 text-white/15" />
                <p className="text-sm text-white/55">Новых событий пока нет</p>
                <p className="mt-1 text-xs text-white/25">Здесь появятся изменения CRM, Academy, Wiki, Team, AI и Calendar</p>
              </div>
            ) : (
              items.map((item) => {
                const meta = moduleMeta[item.module]
                const Icon = meta.icon
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openItem(item)}
                    className={`group mb-1 flex w-full gap-3 rounded-xl border px-3 py-3 text-left transition last:mb-0 ${item.is_read ? "border-transparent bg-transparent hover:bg-white/[0.035]" : "border-violet-400/[0.08] bg-violet-400/[0.045] hover:bg-violet-400/[0.075]"}`}
                  >
                    <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${meta.className}`}><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="truncate text-xs font-medium text-white/90">{item.title}</span>
                        {!item.is_read && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-white/38">{item.description}</span>
                      <span className="mt-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-white/22">
                        <span className="text-white/35">{meta.label}</span>
                        <span>•</span>
                        <span>{relativeTime(item.created_at)}</span>
                        {item.priority === "high" && <span className="ml-auto rounded bg-rose-400/10 px-1.5 py-0.5 text-[8px] text-rose-300">Важно</span>}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
