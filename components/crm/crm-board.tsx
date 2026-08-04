"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRightIcon,
  BrainIcon,
  CalendarIcon,
  SearchIcon,
  TeamIcon,
  UsersIcon,
} from "@/components/icons"

type Candidate = {
  id: number
  name: string
  username: string
  country: string
  source: string
  mentor: string
  status: string
  priority: "high" | "medium" | "low"
  score: number
  lastActivity: string
  nextAction: string
  note: string
  nextContactAt: string | null
}

type ActivityItem = {
  id: number
  eventType: string
  title: string
  description: string
  createdBy: string
  createdAt: string
}

type CommentItem = {
  id: number
  author: string
  body: string
  createdAt: string
}

type TaskItem = {
  id: number
  title: string
  completed: boolean
  dueAt: string | null
  createdBy: string
  createdAt: string
}

type Column = {
  key: string
  title: string
  subtitle: string
  accent: string
}

const columns: Column[] = [
  {
    key: "new",
    title: "Новые",
    subtitle: "Первичный контакт",
    accent: "bg-blue-400",
  },
  {
    key: "contact",
    title: "В работе",
    subtitle: "Диалог начат",
    accent: "bg-violet-400",
  },
  {
    key: "call",
    title: "Созвон",
    subtitle: "Назначено интервью",
    accent: "bg-amber-400",
  },
  {
    key: "training",
    title: "Обучение",
    subtitle: "Проходит Academy",
    accent: "bg-fuchsia-400",
  },
  {
    key: "active",
    title: "Активные",
    subtitle: "Работают в команде",
    accent: "bg-emerald-400",
  },
]


const priorityLabels = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
}

export function CrmBoard() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [priority, setPriority] = useState<"all" | Candidate["priority"]>("all")
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [reminderFilter, setReminderFilter] = useState<
    "all" | "overdue" | "today" | "tomorrow" | "none"
  >("all")
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCandidates() {
      try {
        setLoading(true)
        setError("")

        const response = await fetch("/api/crm/candidates", {
          cache: "no-store",
        })
        const payload = (await response.json()) as {
          candidates?: Candidate[]
          error?: string
        }

        if (!response.ok || !payload.candidates) {
          throw new Error(payload.error || "Не удалось загрузить CRM.")
        }

        if (!cancelled) {
          setCandidates(payload.candidates)
          setSelected(payload.candidates[0] ?? null)
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Неизвестная ошибка CRM.",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCandidates()

    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return candidates.filter((candidate) => {
      const matchesQuery =
        !normalized ||
        candidate.name.toLowerCase().includes(normalized) ||
        candidate.username.toLowerCase().includes(normalized) ||
        candidate.source.toLowerCase().includes(normalized)

      const matchesPriority =
        priority === "all" || candidate.priority === priority

      const reminderState = getReminderState(candidate.nextContactAt)
      const matchesReminder =
        reminderFilter === "all" ||
        (reminderFilter === "none"
          ? reminderState === "none"
          : reminderState === reminderFilter)

      return matchesQuery && matchesPriority && matchesReminder
    })
  }, [candidates, priority, query, reminderFilter])

  async function moveCandidateToStatus(
    candidateId: number,
    nextStatus: string,
  ) {
    const candidate = candidates.find((item) => item.id === candidateId)

    if (
      !candidate ||
      savingId === candidateId ||
      candidate.status === nextStatus ||
      !columns.some((column) => column.key === nextStatus)
    ) {
      return
    }

    const optimistic = { ...candidate, status: nextStatus }

    setSavingId(candidateId)
    setError("")
    setCandidates((current) =>
      current.map((item) => (item.id === candidateId ? optimistic : item)),
    )

    if (selected?.id === candidateId) {
      setSelected(optimistic)
    }

    try {
      const response = await fetch(`/api/crm/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })

      const payload = (await response.json()) as {
        candidate?: Candidate
        error?: string
      }

      if (!response.ok || !payload.candidate) {
        throw new Error(payload.error || "Не удалось изменить этап.")
      }

      setCandidates((current) =>
        current.map((item) =>
          item.id === candidateId ? payload.candidate! : item,
        ),
      )

      if (selected?.id === candidateId) {
        setSelected(payload.candidate)
      }
    } catch (requestError) {
      setCandidates((current) =>
        current.map((item) => (item.id === candidateId ? candidate : item)),
      )

      if (selected?.id === candidateId) {
        setSelected(candidate)
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось изменить этап.",
      )
    } finally {
      setSavingId(null)
    }
  }

  async function moveCandidate(candidateId: number, direction: -1 | 1) {
    const candidate = candidates.find((item) => item.id === candidateId)

    if (!candidate) return

    const currentIndex = columns.findIndex(
      (column) => column.key === candidate.status,
    )
    const nextIndex = Math.min(
      columns.length - 1,
      Math.max(0, currentIndex + direction),
    )

    await moveCandidateToStatus(candidateId, columns[nextIndex].key)
  }

  async function createCandidate(formData: FormData) {
    setError("")

    const response = await fetch("/api/crm/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        username: String(formData.get("username") ?? ""),
        country: String(formData.get("country") ?? ""),
        source: String(formData.get("source") ?? ""),
        mentor: String(formData.get("mentor") ?? ""),
        priority: String(formData.get("priority") ?? "medium"),
        nextAction: String(formData.get("nextAction") ?? ""),
        note: String(formData.get("note") ?? ""),
        nextContactAt: String(formData.get("nextContactAt") ?? "") || null,
      }),
    })

    const payload = (await response.json()) as {
      candidate?: Candidate
      error?: string
    }

    if (!response.ok || !payload.candidate) {
      throw new Error(payload.error || "Не удалось создать кандидата.")
    }

    setCandidates((current) => [payload.candidate!, ...current])
    setSelected(payload.candidate)
    setShowCreate(false)
  }

  const activeCount = candidates.filter(
    (candidate) => candidate.status === "active",
  ).length

  const overdueCount = candidates.filter(
    (candidate) => getReminderState(candidate.nextContactAt) === "overdue",
  ).length

  const highPriorityCount = candidates.filter(
    (candidate) => candidate.priority === "high",
  ).length

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm text-white/35">
          Загружаю кандидатов из PostgreSQL…
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Всего кандидатов"
          value={String(candidates.length)}
          note="+14 за неделю"
          icon={<UsersIcon className="size-[18px]" />}
        />
        <Metric
          label="Высокий приоритет"
          value={String(highPriorityCount)}
          note="Требуют внимания"
          icon={<BrainIcon className="size-[18px]" />}
        />
        <Metric
          label="Просроченные контакты"
          value={String(overdueCount)}
          note={overdueCount ? "Нужно связаться сегодня" : "Всё под контролем"}
          icon={<CalendarIcon className="size-[18px]" />}
        />
        <Metric
          label="Активные в команде"
          value={String(activeCount)}
          note="+8.2% за месяц"
          icon={<TeamIcon className="size-[18px]" />}
        />
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/25" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти кандидата, username или источник..."
              className="h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.03] pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/22 focus:border-violet-400/25"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={reminderFilter}
              onChange={(event) =>
                setReminderFilter(
                  event.target.value as
                    | "all"
                    | "overdue"
                    | "today"
                    | "tomorrow"
                    | "none",
                )
              }
              className="h-10 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-white/45 outline-none"
            >
              <option value="all">Все напоминания</option>
              <option value="overdue">Просрочено</option>
              <option value="today">Сегодня</option>
              <option value="tomorrow">Завтра</option>
              <option value="none">Без даты</option>
            </select>

            <span className="hidden rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[10px] text-white/22 2xl:inline">
              Перетащи карточку в нужный этап
            </span>
            {[
              ["all", "Все"],
              ["high", "Высокий"],
              ["medium", "Средний"],
              ["low", "Низкий"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setPriority(key as "all" | Candidate["priority"])
                }
                className={[
                  "h-10 rounded-xl border px-3 text-xs transition",
                  priority === key
                    ? "border-violet-400/25 bg-violet-400/10 text-violet-200"
                    : "border-white/[0.07] bg-white/[0.025] text-white/35 hover:bg-white/[0.055] hover:text-white/70",
                ].join(" ")}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="h-10 rounded-xl bg-white px-4 text-xs font-semibold text-black transition hover:bg-white/90"
            >
              + Добавить кандидата
            </button>
          </div>
        </div>
      </section>

      <div className="grid min-h-[660px] overflow-hidden rounded-3xl border border-white/[0.07] bg-[#090c12]/78 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 overflow-x-auto p-4">
          <div className="grid min-w-[1250px] grid-cols-5 gap-3">
            {columns.map((column) => {
              const items = filtered.filter(
                (candidate) => candidate.status === column.key,
              )

              return (
                <div
                  key={column.key}
                  onDragEnter={(event) => {
                    event.preventDefault()
                    setDragOverStatus(column.key)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                    setDragOverStatus(column.key)
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setDragOverStatus((current) =>
                        current === column.key ? null : current,
                      )
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()

                    const idFromTransfer = Number(
                      event.dataTransfer.getData("text/plain"),
                    )
                    const candidateId = Number.isSafeInteger(idFromTransfer)
                      ? idFromTransfer
                      : draggedId

                    setDragOverStatus(null)
                    setDraggedId(null)

                    if (candidateId) {
                      void moveCandidateToStatus(candidateId, column.key)
                    }
                  }}
                  className={[
                    "rounded-2xl border p-3 transition duration-200",
                    dragOverStatus === column.key
                      ? "border-violet-400/35 bg-violet-400/[0.065] shadow-[inset_0_0_0_1px_rgba(167,139,250,0.08)]"
                      : "border-white/[0.06] bg-white/[0.018]",
                  ].join(" ")}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "size-2 rounded-full",
                            column.accent,
                          ].join(" ")}
                        />
                        <p className="text-xs font-semibold text-white/78">
                          {column.title}
                        </p>
                      </div>
                      <p className="mt-1 pl-4 text-[10px] text-white/22">
                        {column.subtitle}
                      </p>
                    </div>
                    <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/32">
                      {items.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        selected={selected?.id === candidate.id}
                        onSelect={() => setSelected(candidate)}
                        onMoveLeft={() => moveCandidate(candidate.id, -1)}
                        onMoveRight={() => moveCandidate(candidate.id, 1)}
                        saving={savingId === candidate.id}
                        dragging={draggedId === candidate.id}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move"
                          event.dataTransfer.setData(
                            "text/plain",
                            String(candidate.id),
                          )
                          setDraggedId(candidate.id)
                        }}
                        onDragEnd={() => {
                          setDraggedId(null)
                          setDragOverStatus(null)
                        }}
                      />
                    ))}

                    {!items.length && (
                      <div
                        className={[
                          "rounded-xl border border-dashed px-3 py-8 text-center text-[10px] transition",
                          dragOverStatus === column.key
                            ? "border-violet-400/35 bg-violet-400/[0.055] text-violet-200/70"
                            : "border-white/[0.07] text-white/18",
                        ].join(" ")}
                      >
                        {dragOverStatus === column.key
                          ? "Отпусти карточку здесь"
                          : "Нет кандидатов"}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="hidden border-l border-white/[0.065] bg-black/10 2xl:block">
          {selected ? (
            <CandidateDetails candidate={selected} />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white/25">
              Выбери карточку кандидата
            </div>
          )}
        </aside>
      </div>

      {showCreate && (
        <CreateCandidateModal
          onClose={() => setShowCreate(false)}
          onSubmit={createCandidate}
          onError={setError}
        />
      )}
    </div>
  )
}

function CreateCandidateModal({
  onClose,
  onSubmit,
  onError,
}: {
  onClose: () => void
  onSubmit: (formData: FormData) => Promise<void>
  onError: (message: string) => void
}) {
  const [submitting, setSubmitting] = useState(false)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onMouseDown={onClose}
    >
      <form
        className="w-full max-w-xl rounded-3xl border border-white/[0.1] bg-[#0d1017] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.65)]"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            await onSubmit(new FormData(event.currentTarget))
          } catch (submitError) {
            onError(
              submitError instanceof Error
                ? submitError.message
                : "Не удалось создать кандидата.",
            )
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-white">Новый кандидат</p>
            <p className="mt-1 text-xs text-white/30">
              Данные сохранятся в PostgreSQL.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/35">
            ✕
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Field name="name" label="Имя *" required />
          <Field name="username" label="Telegram" placeholder="@username" />
          <Field name="country" label="Страна" />
          <Field name="source" label="Источник" placeholder="Telegram" />
          <Field name="mentor" label="Наставник" />
          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-white/25">
              Следующий контакт
            </span>
            <input
              type="datetime-local"
              name="nextContactAt"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-white/25">
              Приоритет
            </span>
            <select
              name="priority"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none"
              defaultValue="medium"
            >
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
            </select>
          </label>
        </div>

        <div className="mt-3 space-y-3">
          <Field
            name="nextAction"
            label="Следующее действие"
            placeholder="Связаться с кандидатом"
          />
          <label className="block space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-white/25">
              Заметка
            </span>
            <textarea
              name="note"
              rows={3}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-sm text-white outline-none placeholder:text-white/20"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-white/[0.08] px-4 text-xs text-white/45"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-10 rounded-xl bg-white px-4 text-xs font-semibold text-black disabled:opacity-40"
          >
            {submitting ? "Сохраняю…" : "Создать"}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  name,
  label,
  placeholder,
  required,
}: {
  name: string
  label: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] uppercase tracking-[0.14em] text-white/25">
        {label}
      </span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-white/20"
      />
    </label>
  )
}

function getReminderState(
  value: string | null,
): "overdue" | "today" | "tomorrow" | "future" | "none" {
  if (!value) return "none"

  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return "none"

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

  if (target < now) return "overdue"
  if (target >= today && target < tomorrow) return "today"
  if (target >= tomorrow && target < dayAfterTomorrow) return "tomorrow"
  return "future"
}

function formatReminderDate(value: string | null) {
  if (!value) return "Не назначен"

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return "Некорректная дата"
  }
}

function ReminderBadge({ value }: { value: string | null }) {
  const state = getReminderState(value)

  if (state === "none") return null

  const config = {
    overdue: {
      label: `Просрочено · ${formatReminderDate(value)}`,
      className: "bg-rose-400/10 text-rose-300",
    },
    today: {
      label: `Сегодня · ${formatReminderDate(value)}`,
      className: "bg-amber-400/10 text-amber-300",
    },
    tomorrow: {
      label: `Завтра · ${formatReminderDate(value)}`,
      className: "bg-blue-400/10 text-blue-300",
    },
    future: {
      label: formatReminderDate(value),
      className: "bg-emerald-400/10 text-emerald-300",
    },
  }[state]

  return (
    <div className="mt-3">
      <span
        className={[
          "inline-flex rounded-md px-1.5 py-0.5 text-[9px]",
          config.className,
        ].join(" ")}
      >
        {config.label}
      </span>
    </div>
  )
}

function ContactReminderEditor({ candidate }: { candidate: Candidate }) {
  const [value, setValue] = useState(
    candidate.nextContactAt
      ? new Date(candidate.nextContactAt).toISOString().slice(0, 16)
      : "",
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    setValue(
      candidate.nextContactAt
        ? new Date(candidate.nextContactAt).toISOString().slice(0, 16)
        : "",
    )
    setMessage("")
  }, [candidate.id, candidate.nextContactAt])

  async function save() {
    setSaving(true)
    setMessage("")

    try {
      const response = await fetch(`/api/crm/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextContactAt: value ? new Date(value).toISOString() : null,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось сохранить напоминание.")
      }

      setMessage("Сохранено")
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ошибка сохранения.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <p className="text-[9px] uppercase tracking-[0.16em] text-white/20">
        Напоминание о контакте
      </p>

      <div className="mt-2 flex gap-2">
        <input
          type="datetime-local"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-white/[0.07] bg-white/[0.035] px-2 text-[10px] text-white outline-none"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="h-9 rounded-lg bg-white px-3 text-[10px] font-semibold text-black disabled:opacity-40"
        >
          {saving ? "..." : "Сохранить"}
        </button>
      </div>

      {message && (
        <p className="mt-2 text-[9px] text-white/25">{message}</p>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  note,
  icon,
}: {
  label: string
  value: string
  note: string
  icon: React.ReactNode
}) {
  return (
    <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/32">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
            {value}
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-violet-300">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-[11px] text-white/24">{note}</p>
    </article>
  )
}

function CandidateCard({
  candidate,
  selected,
  onSelect,
  onMoveLeft,
  onMoveRight,
  saving,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  candidate: Candidate
  selected: boolean
  onSelect: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
  saving: boolean
  dragging: boolean
  onDragStart: (event: React.DragEvent<HTMLElement>) => void
  onDragEnd: () => void
}) {
  return (
    <article
      draggable={!saving}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        "group cursor-grab rounded-xl border p-3 transition duration-200 active:cursor-grabbing",
        dragging
          ? "scale-[0.98] border-violet-400/35 bg-violet-400/[0.08] opacity-45"
          : selected
            ? "border-violet-400/25 bg-violet-400/[0.07]"
            : "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.11] hover:bg-white/[0.045]",
      ].join(" ")}
    >
      <Link
        href={`/crm/${candidate.id}`}
        onClick={onSelect}
        className="block w-full text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/70 to-fuchsia-500/70 text-[10px] font-bold text-white">
            {initials(candidate.name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white/82">
                  {candidate.name}
                </p>
                <p className="mt-1 truncate text-[10px] text-white/25">
                  {candidate.username}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-violet-300">
                {candidate.score}%
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-white/30">
                {candidate.source}
              </span>
              <span
                className={[
                  "rounded-md px-1.5 py-0.5 text-[9px]",
                  candidate.priority === "high"
                    ? "bg-rose-400/10 text-rose-300"
                    : candidate.priority === "medium"
                      ? "bg-amber-400/10 text-amber-300"
                      : "bg-emerald-400/10 text-emerald-300",
                ].join(" ")}
              >
                {priorityLabels[candidate.priority]}
              </span>
            </div>

            <ReminderBadge value={candidate.nextContactAt} />

            <p className="mt-3 line-clamp-2 text-[10px] leading-4 text-white/28">
              {candidate.nextAction}
            </p>
          </div>
        </div>
      </Link>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2">
        <span className="text-[9px] text-white/18">
          {candidate.lastActivity}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={saving}
            onClick={onMoveLeft}
            className="flex size-7 items-center justify-center rounded-lg text-xs text-white/25 transition hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-30"
          >
            ←
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onMoveRight}
            className="flex size-7 items-center justify-center rounded-lg text-xs text-white/25 transition hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-30"
          >
            {saving ? "·" : "→"}
          </button>
        </div>
      </div>
    </article>
  )
}

function CandidateDetails({ candidate }: { candidate: Candidate }) {
  const [tab, setTab] = useState<"overview" | "timeline" | "comments" | "tasks">(
    "overview",
  )
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [comments, setComments] = useState<CommentItem[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(false)
  const [panelError, setPanelError] = useState("")
  const [commentText, setCommentText] = useState("")
  const [taskText, setTaskText] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadRelated() {
      setLoading(true)
      setPanelError("")

      try {
        const [activityResponse, commentsResponse, tasksResponse] =
          await Promise.all([
            fetch(`/api/crm/candidates/${candidate.id}/activity`, {
              cache: "no-store",
            }),
            fetch(`/api/crm/candidates/${candidate.id}/comments`, {
              cache: "no-store",
            }),
            fetch(`/api/crm/candidates/${candidate.id}/tasks`, {
              cache: "no-store",
            }),
          ])

        const [activityPayload, commentsPayload, tasksPayload] =
          await Promise.all([
            activityResponse.json(),
            commentsResponse.json(),
            tasksResponse.json(),
          ])

        if (!activityResponse.ok) {
          throw new Error(activityPayload.error || "Ошибка Timeline.")
        }
        if (!commentsResponse.ok) {
          throw new Error(commentsPayload.error || "Ошибка комментариев.")
        }
        if (!tasksResponse.ok) {
          throw new Error(tasksPayload.error || "Ошибка задач.")
        }

        if (!cancelled) {
          setActivity(activityPayload.activity ?? [])
          setComments(commentsPayload.comments ?? [])
          setTasks(tasksPayload.tasks ?? [])
        }
      } catch (requestError) {
        if (!cancelled) {
          setPanelError(
            requestError instanceof Error
              ? requestError.message
              : "Не удалось загрузить карточку.",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadRelated()

    return () => {
      cancelled = true
    }
  }, [candidate.id])

  async function addComment() {
    const body = commentText.trim()
    if (!body) return

    const response = await fetch(
      `/api/crm/candidates/${candidate.id}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, author: "VSIPEK" }),
      },
    )
    const payload = await response.json()

    if (!response.ok || !payload.comment) {
      setPanelError(payload.error || "Не удалось добавить комментарий.")
      return
    }

    setComments((current) => [...current, payload.comment])
    setCommentText("")
    setActivity((current) => [
      {
        id: Date.now(),
        eventType: "comment",
        title: "Добавлен комментарий",
        description: body,
        createdBy: "VSIPEK",
        createdAt: new Date().toISOString(),
      },
      ...current,
    ])
  }

  async function addTask() {
    const title = taskText.trim()
    if (!title) return

    const response = await fetch(`/api/crm/candidates/${candidate.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, createdBy: "VSIPEK" }),
    })
    const payload = await response.json()

    if (!response.ok || !payload.task) {
      setPanelError(payload.error || "Не удалось создать задачу.")
      return
    }

    setTasks((current) => [payload.task, ...current])
    setTaskText("")
    setActivity((current) => [
      {
        id: Date.now(),
        eventType: "task",
        title: "Создана задача",
        description: title,
        createdBy: "VSIPEK",
        createdAt: new Date().toISOString(),
      },
      ...current,
    ])
  }

  async function toggleTask(task: TaskItem) {
    const optimistic = { ...task, completed: !task.completed }

    setTasks((current) =>
      current.map((item) => (item.id === task.id ? optimistic : item)),
    )

    const response = await fetch(`/api/crm/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: optimistic.completed }),
    })
    const payload = await response.json()

    if (!response.ok || !payload.task) {
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? task : item)),
      )
      setPanelError(payload.error || "Не удалось обновить задачу.")
      return
    }

    setTasks((current) =>
      current.map((item) => (item.id === task.id ? payload.task : item)),
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.065] p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">
            {initials(candidate.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {candidate.name}
            </p>
            <p className="mt-1 text-xs text-white/28">{candidate.username}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-md bg-violet-400/10 px-2 py-0.5 text-[9px] text-violet-200">
                AI score {candidate.score}%
              </span>
              <span className="rounded-md border border-white/[0.06] px-2 py-0.5 text-[9px] text-white/28">
                {candidate.country}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
          {[
            ["overview", "Обзор"],
            ["timeline", "История"],
            ["comments", "Чат"],
            ["tasks", "Задачи"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setTab(
                  key as "overview" | "timeline" | "comments" | "tasks",
                )
              }
              className={[
                "h-8 rounded-lg text-[9px] transition",
                tab === key
                  ? "bg-white/[0.08] text-white"
                  : "text-white/25 hover:text-white/60",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {panelError && (
          <div className="mb-4 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] px-3 py-2 text-[11px] text-rose-200">
            {panelError}
          </div>
        )}

        {loading && (
          <p className="text-xs text-white/25">Загрузка данных кандидата…</p>
        )}

        {!loading && tab === "overview" && (
          <>
            <section>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">
                Информация
              </p>
              <dl className="mt-3 space-y-3 text-xs">
                <InfoRow label="Источник" value={candidate.source} />
                <InfoRow label="Наставник" value={candidate.mentor} />
                <InfoRow
                  label="Приоритет"
                  value={priorityLabels[candidate.priority]}
                />
                <InfoRow label="Активность" value={candidate.lastActivity} />
                <InfoRow
                  label="Следующий контакт"
                  value={formatReminderDate(candidate.nextContactAt)}
                />
              </dl>

              <ContactReminderEditor candidate={candidate} />
            </section>

            <section className="mt-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">
                Следующее действие
              </p>
              <div className="mt-3 rounded-xl border border-violet-400/14 bg-violet-400/[0.055] p-3">
                <p className="text-xs leading-5 text-white/68">
                  {candidate.nextAction}
                </p>
              </div>
            </section>

            <section className="mt-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">
                Заметка
              </p>
              <p className="mt-3 text-xs leading-5 text-white/38">
                {candidate.note}
              </p>
            </section>

            <section className="mt-6 rounded-2xl border border-fuchsia-400/12 bg-gradient-to-br from-violet-500/[0.09] to-fuchsia-500/[0.035] p-4">
              <div className="flex items-center gap-2 text-violet-200">
                <BrainIcon className="size-4" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                  AI Recommendation
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/48">
                Напиши кандидату сегодня. Используй короткое сообщение и уточни,
                какое время удобно для следующего шага.
              </p>
              <button
                type="button"
                className="mt-4 flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-[10px] font-semibold text-black transition hover:bg-white/90"
              >
                Подготовить сообщение
                <ArrowUpRightIcon className="size-3.5" />
              </button>
            </section>
          </>
        )}

        {!loading && tab === "timeline" && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">
              Timeline
            </p>

            <div className="mt-4 space-y-0">
              {activity.length ? (
                activity.map((item, index) => (
                  <div key={item.id} className="relative flex gap-3 pb-5">
                    {index !== activity.length - 1 && (
                      <span className="absolute left-[5px] top-4 h-[calc(100%-4px)] w-px bg-white/[0.07]" />
                    )}
                    <span className="relative mt-1 size-2.5 shrink-0 rounded-full border-2 border-[#0b0e14] bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.7)]" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/72">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="mt-1 text-[11px] leading-4 text-white/30">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-1.5 text-[9px] text-white/18">
                        {formatDate(item.createdAt)} · {item.createdBy}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/22">Событий пока нет.</p>
              )}
            </div>
          </div>
        )}

        {!loading && tab === "comments" && (
          <div className="flex min-h-[470px] flex-col">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">
              Комментарии команды
            </p>

            <div className="mt-4 flex-1 space-y-3">
              {comments.length ? (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold text-violet-200">
                        {comment.author}
                      </p>
                      <p className="text-[9px] text-white/18">
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-white/55">
                      {comment.body}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/22">
                  Комментариев пока нет.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2">
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                rows={3}
                placeholder="Написать комментарий..."
                className="w-full resize-none bg-transparent px-2 py-2 text-xs text-white outline-none placeholder:text-white/20"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void addComment()}
                  className="h-8 rounded-lg bg-white px-3 text-[10px] font-semibold text-black"
                >
                  Отправить
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && tab === "tasks" && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">
              Задачи кандидата
            </p>

            <div className="mt-4 space-y-2">
              {tasks.map((task) => (
                <label
                  key={task.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition hover:bg-white/[0.045]"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => void toggleTask(task)}
                    className="mt-0.5 size-4 accent-violet-500"
                  />
                  <div className="min-w-0">
                    <p
                      className={[
                        "text-xs leading-5",
                        task.completed
                          ? "text-white/25 line-through"
                          : "text-white/62",
                      ].join(" ")}
                    >
                      {task.title}
                    </p>
                    <p className="mt-1 text-[9px] text-white/18">
                      {task.createdBy} · {formatDate(task.createdAt)}
                    </p>
                  </div>
                </label>
              ))}

              {!tasks.length && (
                <p className="text-xs text-white/22">Задач пока нет.</p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={taskText}
                onChange={(event) => setTaskText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void addTask()
                }}
                placeholder="Новая задача..."
                className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-white outline-none placeholder:text-white/20"
              />
              <button
                type="button"
                onClick={() => void addTask()}
                className="h-10 rounded-xl bg-white px-3 text-[10px] font-semibold text-black"
              >
                Добавить
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.065] p-4">
        <Link
          href={`/crm/${candidate.id}`}
          className="flex h-10 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-xs text-white/55 transition hover:bg-white/[0.07] hover:text-white"
        >
          Открыть полную карточку
        </Link>
      </div>
    </div>
  )
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-white/25">{label}</dt>
      <dd className="truncate text-right text-white/62">{value}</dd>
    </div>
  )
}