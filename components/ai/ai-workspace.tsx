"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import {
  ArrowUpRightIcon,
  BookIcon,
  BrainIcon,
  ChartIcon,
  SearchIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons"

type Source = { type: "crm" | "wiki" | "team" | "academy"; id: string; title: string; href: string }

type Message = {
  role: "assistant" | "user"
  text: string
  sources?: Source[]
}

const conversations = [
  { title: "Новый рабочий диалог", time: "Сейчас", active: true },
  { title: "Анализ команды за неделю", time: "18 мин" },
  { title: "Выплаты наставников", time: "Вчера" },
  { title: "Материалы по Матрёшке", time: "2 дня" },
]

const tools = [
  {
    title: "CRM-анализ",
    description: "Подготовить план анализа кандидатов",
    icon: UsersIcon,
    prompt:
      "Составь пошаговый план анализа CRM: кого проверить и какие показатели сравнить.",
  },
  {
    title: "Knowledge Search",
    description: "Сформулировать запрос к базе знаний",
    icon: BookIcon,
    prompt:
      "Помоги составить точный поисковый запрос для внутренней базы знаний LEGION.",
  },
  {
    title: "Analytics",
    description: "Разобрать изменение конверсии",
    icon: ChartIcon,
    prompt:
      "Объясни, какие причины обычно влияют на изменение конверсии команды и что проверить.",
  },
  {
    title: "Finance",
    description: "Подготовить проверку начислений",
    icon: WalletIcon,
    prompt:
      "Составь чек-лист для проверки начислений и выплат наставникам.",
  },
]

const initialMessages: Message[] = [
  {
    role: "assistant",
    text:
      "Добро пожаловать в LEGION Intelligence. Теперь этот чат подключён к настоящему Gemini API.",
  },
  {
    role: "assistant",
    text:
      "Я подключён к реальным данным CRM, Wiki, Team и Academy. Задай вопрос о кандидате, сотруднике, статье или курсе.",
  },
]

export function AiWorkspace() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return conversations

    return conversations.filter((item) =>
      item.title.toLowerCase().includes(query),
    )
  }, [search])

  async function submitMessage(text?: string) {
    const value = (text ?? input).trim()

    if (!value || loading) return

    const history = messages.slice(-12)
    const userMessage: Message = { role: "user", text: value }

    setMessages((current) => [...current, userMessage])
    setInput("")
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: value,
          history,
        }),
      })

      const payload = (await response.json()) as {
        answer?: string
        error?: string
        sources?: Source[]
      }

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || "AI не вернул ответ.")
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: payload.answer ?? "",
          sources: payload.sources ?? [],
        },
      ])
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Неизвестная ошибка AI."

      setError(message)
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-152px)] overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0a0d13]/82 shadow-[0_28px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl xl:grid-cols-[290px_minmax(0,1fr)_320px]">
      <aside className="hidden border-r border-white/[0.065] bg-black/10 xl:flex xl:flex-col">
        <div className="border-b border-white/[0.065] p-4">
          <button
            type="button"
            onClick={() => {
              setMessages(initialMessages)
              setInput("")
              setError("")
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-semibold text-black transition hover:bg-white/90"
          >
            <SparklesIcon className="size-4" />
            Новый диалог
          </button>

          <div className="relative mt-3">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/25" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск диалогов..."
              className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.03] pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/22"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/20">
            История
          </p>

          <div className="space-y-1">
            {filteredConversations.map((item) => (
              <button
                key={item.title}
                type="button"
                className={[
                  "w-full rounded-xl px-3 py-3 text-left transition",
                  item.active
                    ? "bg-white/[0.07]"
                    : "hover:bg-white/[0.035]",
                ].join(" ")}
              >
                <p className="truncate text-xs text-white/68">{item.title}</p>
                <p className="mt-1 text-[10px] text-white/22">{item.time}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.065] p-4">
          <div className="rounded-xl border border-violet-400/12 bg-violet-400/[0.05] p-3">
            <div className="flex items-center gap-2 text-violet-200">
              <BrainIcon className="size-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">
                AI Memory
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-white/30">
              В запрос отправляются последние 12 сообщений текущего диалога.
            </p>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        <div className="flex h-16 items-center justify-between border-b border-white/[0.065] px-5 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              Новый рабочий диалог
            </p>
            <p className="mt-0.5 text-[10px] text-white/25">
              Gemini API · CRM + Wiki + Team + Academy
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-400/12 bg-emerald-400/[0.05] px-2.5 py-1 text-[9px] font-medium text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            LIVE AI
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-7 sm:px-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="mb-10 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200 shadow-[0_0_45px_rgba(139,92,246,0.16)]">
                <BrainIcon className="size-6" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">
                LEGION Intelligence
              </h1>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/32">
                AI с защищённым Gemini API и контекстом из CRM, Wiki, Team и Academy.
              </p>
            </div>

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={[
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                <div
                  className={[
                    "max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6",
                    message.role === "user"
                      ? "bg-violet-500 text-white shadow-[0_12px_35px_rgba(124,58,237,0.18)]"
                      : "border border-white/[0.07] bg-white/[0.035] text-white/68",
                  ].join(" ")}
                >
                  {message.text}
                  {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/[0.07] pt-3">
                      {message.sources.map((source) => (
                        <Link key={`${source.type}-${source.id}`} href={source.href} className="rounded-md border border-violet-300/15 bg-violet-400/[0.07] px-2 py-1 text-[10px] text-violet-200 transition hover:bg-violet-400/[0.14]">
                          {source.type.toUpperCase()} · {source.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3">
                  <span className="size-1.5 animate-pulse rounded-full bg-violet-300" />
                  <span className="size-1.5 animate-pulse rounded-full bg-violet-300 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-violet-300 [animation-delay:300ms]" />
                  <span className="ml-1 text-xs text-white/30">
                    LEGION AI думает…
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.06] px-4 py-3 text-sm leading-6 text-rose-200">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.065] p-4 sm:p-5">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap gap-2 pb-3">
              {tools.slice(0, 3).map((tool) => (
                <button
                  key={tool.title}
                  type="button"
                  onClick={() => {
                    setInput(tool.prompt)
                    textareaRef.current?.focus()
                  }}
                  className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[10px] text-white/35 transition hover:bg-white/[0.06] hover:text-white/70"
                >
                  {tool.title}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-2 focus-within:border-violet-400/25">
              <textarea
                ref={textareaRef}
                value={input}
                disabled={loading}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void submitMessage()
                  }
                }}
                rows={1}
                placeholder="Спросить LEGION AI..."
                className="min-h-11 max-h-32 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/22 disabled:opacity-50"
              />
              <button
                type="button"
                disabled={loading || !input.trim()}
                onClick={() => void submitMessage()}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowUpRightIcon className="size-4" />
              </button>
            </div>

            <p className="mt-2 text-center text-[9px] text-white/18">
              Ключ Gemini хранится только на сервере и не отправляется в браузер.
            </p>
          </div>
        </div>
      </section>

      <aside className="hidden border-l border-white/[0.065] bg-black/10 p-4 xl:block">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-violet-300" />
          <p className="text-xs font-semibold text-white">AI Tools</p>
        </div>

        <div className="mt-4 space-y-2">
          {tools.map((tool) => {
            const Icon = tool.icon

            return (
              <button
                key={tool.title}
                type="button"
                onClick={() => {
                  setInput(tool.prompt)
                  textareaRef.current?.focus()
                }}
                className="group w-full rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:border-violet-400/15 hover:bg-white/[0.05]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-violet-300">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/72">
                      {tool.title}
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-white/25">
                      {tool.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-violet-500/[0.1] to-transparent p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200">
            Current Connection
          </p>

          <div className="mt-3 space-y-2 text-[11px] text-white/35">
            <div className="flex items-center justify-between">
              <span>Gemini API</span>
              <span className="text-emerald-300">Live</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Dialog Memory</span>
              <span className="text-emerald-300">12 messages</span>
            </div>
            <div className="flex items-center justify-between">
              <span>CRM Data</span>
              <span className="text-amber-300">Next sprint</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Wiki RAG</span>
              <span className="text-amber-300">Next sprint</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
