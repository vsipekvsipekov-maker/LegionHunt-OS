"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BookIcon,
  BrainIcon,
  CommandIcon,
  GraduationIcon,
  GridIcon,
  SearchIcon,
  TeamIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons"

type ResultType = "team" | "crm" | "academy" | "wiki"
type SearchResult = {
  id: string
  type: ResultType
  subtype: string
  title: string
  subtitle: string
  meta: string
  href: string
  score: number
}

type CommandItem = {
  key: string
  title: string
  subtitle: string
  meta?: string
  href: string
  type: ResultType | "navigation"
}

const navigation: CommandItem[] = [
  { key: "nav-dashboard", title: "Dashboard", subtitle: "Главная панель", href: "/", type: "navigation" },
  { key: "nav-ai", title: "AI Center", subtitle: "Диалоги и AI-агенты", href: "/ai", type: "navigation" },
  { key: "nav-crm", title: "CRM", subtitle: "Кандидаты и воронка", href: "/crm", type: "navigation" },
  { key: "nav-wiki", title: "Wiki", subtitle: "База знаний", href: "/wiki", type: "navigation" },
  { key: "nav-academy", title: "Academy", subtitle: "Курсы и обучение", href: "/academy", type: "navigation" },
  { key: "nav-team", title: "Team", subtitle: "Участники команды", href: "/team", type: "navigation" },
  { key: "nav-analytics", title: "Analytics", subtitle: "Метрики системы", href: "/analytics", type: "navigation" },
  { key: "nav-workflows", title: "Automation", subtitle: "Автоматические процессы", href: "/workflows", type: "navigation" },
  { key: "nav-finance", title: "Finance", subtitle: "Доходы, расходы и прибыль", href: "/finance", type: "navigation" },
  { key: "nav-calendar", title: "Calendar", subtitle: "Встречи, дедлайны и события", href: "/calendar", type: "navigation" },
]

const groupLabels: Record<CommandItem["type"], string> = {
  navigation: "Разделы",
  team: "Team",
  crm: "CRM",
  academy: "Academy",
  wiki: "Wiki",
}

function ItemIcon({ type }: { type: CommandItem["type"] }) {
  const Icon = type === "team" ? TeamIcon : type === "crm" ? UsersIcon : type === "academy" ? GraduationIcon : type === "wiki" ? BookIcon : type === "navigation" ? GridIcon : WalletIcon
  return <Icon className="size-4" />
}

export function CommandPalette() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  function closePalette() {
    setOpen(false)
    setQuery("")
    setResults([])
    setLoading(false)
    setActiveIndex(0)
  }

  useEffect(() => {
    const toggle = () => setOpen((value) => !value)
    const openPalette = () => setOpen(true)
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        toggle()
      }
      if (event.key === "Escape") closePalette()
    }
    window.addEventListener("keydown", handler)
    window.addEventListener("legionhunt:open-command", openPalette)
    return () => {
      window.removeEventListener("keydown", handler)
      window.removeEventListener("legionhunt:open-command", openPalette)
    }
  }, [])

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    const normalized = query.trim()
    if (normalized.length < 2) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}&limit=32`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = await response.json()
        if (response.ok) setResults(payload.results ?? [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error)
      } finally {
        setLoading(false)
      }
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return navigation
    const matchingNavigation = navigation.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(q))
    const dynamic = q.length < 2 ? [] : results.map((item) => ({
      key: `${item.type}-${item.subtype}-${item.id}`,
      title: item.title,
      subtitle: item.subtitle,
      meta: item.meta,
      href: item.href,
      type: item.type,
    }))
    return [...matchingNavigation, ...dynamic]
  }, [query, results])


  function openItem(item: CommandItem) {
    closePalette()
    router.push(item.href)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, Math.max(items.length - 1, 0)))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === "Enter" && items[activeIndex]) {
      event.preventDefault()
      openItem(items[activeIndex])
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 pt-[9vh] backdrop-blur-md" onMouseDown={closePalette}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0d1017]/98 shadow-[0_30px_120px_rgba(0,0,0,0.72)]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5">
          <SearchIcon className="size-5 text-white/35" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              const value = event.target.value
              setQuery(value)
              setActiveIndex(0)
              if (value.trim().length < 2) {
                setResults([])
                setLoading(false)
              }
            }}
            onKeyDown={onKeyDown}
            placeholder="Поиск по CRM, Team, Wiki и Academy..."
            className="h-16 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
          />
          {loading ? <span className="text-[10px] text-violet-300/70">ПОИСК...</span> : <kbd className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] text-white/35">ESC</kbd>}
        </div>

        <div className="max-h-[470px] overflow-y-auto p-2">
          {items.length ? items.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => openItem(item)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${index === activeIndex ? "bg-white/[0.075]" : "hover:bg-white/[0.045]"}`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-violet-300"><ItemIcon type={item.type} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm text-white/82">{item.title}</p>
                  <span className="shrink-0 rounded-md border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] text-white/25">{groupLabels[item.type]}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-white/30">{item.subtitle}</p>
                {item.meta && <p className="mt-1 line-clamp-1 text-[10px] text-white/20">{item.meta}</p>}
              </div>
              <span className="text-xs text-white/20">↵</span>
            </button>
          )) : (
            <div className="px-4 py-12 text-center">
              <CommandIcon className="mx-auto size-7 text-white/20" />
              <p className="mt-3 text-sm text-white/40">{query.trim().length < 2 ? "Введите минимум 2 символа" : loading ? "Ищем по системе..." : "Ничего не найдено"}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3 text-[10px] text-white/25">
          <span>↑↓ Навигация · Enter Открыть · Esc Закрыть</span>
          <span className="flex items-center gap-1.5"><BrainIcon className="size-3" /> LegionHunt Search</span>
        </div>
      </div>
    </div>
  )
}
