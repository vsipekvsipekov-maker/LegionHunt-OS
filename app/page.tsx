import Link from "next/link"

import {
  BrainIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  UsersIcon,
} from "@/components/icons"
import { DashboardShell } from "@/components/layout/shell"
import { CrmFunnelChart } from "@/components/dashboard/crm-funnel-chart"
import { requireUser } from "@/lib/auth"
import { db, ensureCrmSchema } from "@/lib/db"

type StageRow = {
  status: string
  count: string
}

type DashboardCandidate = {
  id: string
  name: string
  username: string
  status: string
  priority: string
  next_action: string
  next_contact_at: string | null
  updated_at: string
}

type DailyRow = {
  day: string
  count: string
}

const statusLabels: Record<string, string> = {
  new: "Новые",
  contact: "В работе",
  call: "Созвон",
  training: "Обучение",
  active: "Активные",
  lost: "Потерянные",
}

const statusOrder = ["new", "contact", "call", "training", "active", "lost"]

const quickActions = [
  {
    label: "Открыть CRM",
    description: "Кандидаты и следующие действия",
    href: "/crm",
    icon: UsersIcon,
  },
  {
    label: "Найти в Wiki",
    description: "Регламенты и инструкции",
    href: "/wiki",
    icon: BookIcon,
  },
  {
    label: "Спросить AI",
    description: "LEGION Intelligence",
    href: "/ai",
    icon: BrainIcon,
  },
  {
    label: "Открыть Calendar",
    description: "Встречи и задачи",
    href: "/calendar",
    icon: CalendarIcon,
  },
]

function formatDate(value: string | null) {
  if (!value) return "Дата не назначена"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Некорректная дата"
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default async function Home() {
  const currentUser = await requireUser()

  await ensureCrmSchema()

  const [stageResult, overdueResult, upcomingResult, recentResult, dailyResult] =
    await Promise.all([
      db.query<StageRow>(`
        SELECT status, COUNT(*)::text AS count
        FROM legionhunt_candidates
        GROUP BY status
      `),
      db.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM legionhunt_candidates
        WHERE next_contact_at IS NOT NULL
          AND next_contact_at < NOW()
          AND status <> 'active'
      `),
      db.query<DashboardCandidate>(`
        SELECT
          id::text,
          name,
          username,
          status,
          priority,
          next_action,
          next_contact_at::text,
          updated_at::text
        FROM legionhunt_candidates
        WHERE next_contact_at IS NOT NULL
          AND next_contact_at >= NOW()
        ORDER BY next_contact_at ASC
        LIMIT 5
      `),
      db.query<DashboardCandidate>(`
        SELECT
          id::text,
          name,
          username,
          status,
          priority,
          next_action,
          next_contact_at::text,
          updated_at::text
        FROM legionhunt_candidates
        ORDER BY updated_at DESC, id DESC
        LIMIT 6
      `),
      db.query<DailyRow>(`
        SELECT
          TO_CHAR(day_series.day, 'DD.MM') AS day,
          COUNT(c.id)::text AS count
        FROM generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        ) AS day_series(day)
        LEFT JOIN legionhunt_candidates c
          ON c.created_at >= day_series.day
         AND c.created_at < day_series.day + INTERVAL '1 day'
        GROUP BY day_series.day
        ORDER BY day_series.day
      `),
    ])

  const stageCounts = new Map(
    stageResult.rows.map((row) => [row.status, Number(row.count)]),
  )

  const totalCandidates = Array.from(stageCounts.values()).reduce(
    (total, count) => total + count,
    0,
  )

  const activeCount = stageCounts.get("active") ?? 0
  const trainingCount = stageCounts.get("training") ?? 0
  const overdueCount = Number(overdueResult.rows[0]?.count ?? 0)

  const conversion =
    totalCandidates > 0
      ? Math.round((activeCount / totalCandidates) * 100)
      : 0

  const displayName =
    currentUser.fullName?.trim() ||
    currentUser.email?.split("@")[0] ||
    "пользователь"

  const metrics = [
    {
      label: "Всего кандидатов",
      value: String(totalCandidates),
      note: "Все записи в CRM",
      icon: UsersIcon,
      href: "/crm",
    },
    {
      label: "Конверсия в активные",
      value: `${conversion}%`,
      note: `${activeCount} активных участников`,
      icon: ChartIcon,
      href: "/analytics",
    },
    {
      label: "В обучении",
      value: String(trainingCount),
      note: "Текущий этап Academy",
      icon: BrainIcon,
      href: "/academy",
    },
    {
      label: "Просрочено контактов",
      value: String(overdueCount),
      note: overdueCount ? "Требуют внимания" : "Всё под контролем",
      icon: CalendarIcon,
      href: "/crm",
    },
  ]

  const funnelStages = statusOrder.map((status) => ({
    key: status,
    label: statusLabels[status] ?? status,
    value: stageCounts.get(status) ?? 0,
  }))

  const dailyGrowth = dailyResult.rows.map((row) => ({
    label: row.day,
    value: Number(row.count),
  }))

  return (
    <DashboardShell>
      <div className="lh-page">
        <section className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:gap-6 sm:pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="lh-eyebrow">LegionHunt Command Center</p>

            <h1 className="lh-title mt-2.5 sm:mt-3">
              Добро пожаловать, {displayName}
            </h1>

            <p className="lh-subtitle">
              Живой обзор CRM, воронки, контактов и активности команды.
            </p>
          </div>

          <div className="flex min-h-11 w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2.5 text-xs font-medium text-white/55 sm:w-auto">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            Данные синхронизированы
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:mt-7 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon

            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="lh-metric-card group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/68 sm:size-12">
                    <Icon className="size-[22px] sm:size-5" />
                  </div>

                  <span className="text-xl text-white/22 transition group-hover:text-white/55">
                    ↗
                  </span>
                </div>

                <p className="mt-5 text-[13px] font-medium text-white/45 sm:mt-7">
                  {metric.label}
                </p>

                <p className="mt-1.5 text-3xl font-semibold tracking-[-0.055em] text-white sm:mt-2 sm:text-4xl">
                  {metric.value}
                </p>

                <p className="mt-2 text-xs leading-5 text-white/32 sm:mt-3">
                  {metric.note}
                </p>
              </Link>
            )
          })}
        </section>

        <section className="lh-section-gap grid gap-4 sm:gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="lh-card lh-panel-padding">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="lh-eyebrow">CRM Analytics</p>
                <h2 className="lh-section-title mt-2">
                  Воронка кандидатов
                </h2>
              </div>

              <Link
                href="/crm"
                className="text-sm text-white/40 transition hover:text-white"
              >
                Открыть CRM ↗
              </Link>
            </div>

            <CrmFunnelChart
              stages={funnelStages}
              dailyGrowth={dailyGrowth}
            />
          </div>

          <div className="lh-card lh-panel-padding">
            <p className="lh-eyebrow">LEGION Intelligence</p>

            <h2 className="lh-section-title mt-2">
              Оперативная сводка
            </h2>

            <div className="mt-5 space-y-3 text-sm leading-6 text-white/48">
              <p>
                В CRM находится <strong className="text-white">{totalCandidates}</strong>{" "}
                кандидатов.
              </p>
              <p>
                В активную команду перешли{" "}
                <strong className="text-white">{activeCount}</strong>, текущая
                конверсия — <strong className="text-white">{conversion}%</strong>.
              </p>
              <p>
                Просроченных контактов:{" "}
                <strong className={overdueCount ? "text-rose-300" : "text-emerald-300"}>
                  {overdueCount}
                </strong>.
              </p>
            </div>

            <Link
              href="/ai"
              className="mt-7 flex min-h-28 flex-col justify-between rounded-3xl bg-white p-5 text-black transition hover:bg-white/90"
            >
              <BrainIcon className="size-6" />
              <div>
                <p className="text-lg font-semibold">Открыть AI Center</p>
                <p className="mt-1 text-sm text-black/55">
                  Получить расширенный анализ →
                </p>
              </div>
            </Link>
          </div>
        </section>

        <section className="lh-section-gap grid gap-4 sm:gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="lh-card lh-panel-padding">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="lh-eyebrow">Контакты</p>
                <h2 className="lh-section-title mt-2">
                  Ближайшие действия
                </h2>
              </div>
              <CalendarIcon className="size-6 text-white/25" />
            </div>

            <div className="mt-6 space-y-3">
              {upcomingResult.rows.map((candidate) => (
                <Link
                  key={candidate.id}
                  href={`/crm/${candidate.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:bg-white/[0.055]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {candidate.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-white/32">
                      {candidate.next_action || "Связаться с кандидатом"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-white/38">
                    {formatDate(candidate.next_contact_at)}
                  </span>
                </Link>
              ))}

              {!upcomingResult.rows.length && (
                <div className="lh-empty min-h-40">
                  <CalendarIcon className="size-6 text-white/25" />
                  <p className="mt-3 text-sm text-white/35">
                    Ближайшие контакты не назначены.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lh-card lh-panel-padding">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="lh-eyebrow">Журнал</p>
                <h2 className="lh-section-title mt-2">
                  Последние изменения
                </h2>
              </div>
              <ChartIcon className="size-6 text-white/25" />
            </div>

            <div className="mt-6 space-y-3">
              {recentResult.rows.map((candidate) => (
                <Link
                  key={candidate.id}
                  href={`/crm/${candidate.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:bg-white/[0.055]"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-semibold text-white/70">
                    {candidate.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {candidate.name}
                    </p>
                    <p className="mt-1 text-xs text-white/30">
                      Этап: {statusLabels[candidate.status] ?? candidate.status}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-white/25">
                    {formatDate(candidate.updated_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="lh-section-gap">
          <div className="lh-card lh-panel-padding">
            <p className="lh-eyebrow">Быстрые действия</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon

                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="rounded-2xl border border-white/9 bg-white/[0.025] p-4 transition hover:border-white/18 hover:bg-white/[0.055]"
                  >
                    <Icon className="size-5 text-white/58" />
                    <p className="mt-4 text-sm font-semibold text-white">
                      {action.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/32">
                      {action.description}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
