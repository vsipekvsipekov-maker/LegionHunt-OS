import Link from "next/link"
import { redirect } from "next/navigation"

import {
  BrainIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons"
import { DashboardShell } from "@/components/layout/shell"
import { db, ensureCrmSchema } from "@/lib/db"
import { createClient } from "@/lib/supabase-server"

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

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle()

  await ensureCrmSchema()

  const candidatesResult = await db.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM legionhunt_candidates
  `)

  const candidatesCount = Number(
    candidatesResult.rows[0]?.count ?? 0,
  )

  const metrics = [
    {
      label: "Активные кандидаты",
      value: String(candidatesCount),
      note: "Данные из CRM",
      icon: UsersIcon,
      href: "/crm",
    },
    {
      label: "Конверсия",
      value: "0%",
      note: "Появится после переходов кандидатов",
      icon: ChartIcon,
      href: "/analytics",
    },
    {
      label: "AI-запросы сегодня",
      value: "0",
      note: "История появится после диалогов",
      icon: BrainIcon,
      href: "/ai",
    },
    {
      label: "Баланс",
      value: "€0",
      note: "Finance начинает работу с нуля",
      icon: WalletIcon,
      href: "/finance",
    },
  ]

  const displayName =
    profile?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "пользователь"

  return (
    <DashboardShell>
      <div className="lh-page">
        <section className="flex flex-col gap-6 border-b border-white/8 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="lh-eyebrow">
              LegionHunt Command Center
            </p>

            <h1 className="lh-title mt-3">
              Добро пожаловать, {displayName}
            </h1>

            <p className="lh-subtitle">
              Единый центр управления командой, кандидатами,
              знаниями, финансами и AI. Показатели работают
              с реальными данными системы.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2.5 text-xs font-medium text-white/55">
            <span className="size-1.5 rounded-full bg-white" />
            Рабочее пространство готово
          </div>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon

            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="lh-card lh-card-hover group p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/68">
                    <Icon className="size-5" />
                  </div>

                  <span className="text-xl text-white/22 transition group-hover:text-white/55">
                    ↗
                  </span>
                </div>

                <p className="mt-7 text-[13px] font-medium text-white/45">
                  {metric.label}
                </p>

                <p className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-white">
                  {metric.value}
                </p>

                <p className="mt-3 text-xs leading-5 text-white/32">
                  {metric.note}
                </p>
              </Link>
            )
          })}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="lh-card p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="lh-eyebrow">Обзор</p>

                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                  Активность системы
                </h2>
              </div>

              <Link
                href="/analytics"
                className="text-sm text-white/40 transition hover:text-white"
              >
                Analytics ↗
              </Link>
            </div>

            <div className="lh-empty mt-7">
              <ChartIcon className="size-7 text-white/28" />

              <h3 className="mt-4 text-lg font-semibold text-white">
                Пока нет данных для графика
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/38">
                График появится после накопления действий в CRM,
                Team, Finance и других модулях.
              </p>
            </div>
          </div>

          <div className="lh-card p-6 sm:p-7">
            <p className="lh-eyebrow">
              LEGION Intelligence
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
              AI Center
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/42">
              Используйте AI для поиска по Wiki, разбора CRM
              и подготовки следующих действий.
            </p>

            <Link
              href="/ai"
              className="mt-7 flex min-h-32 flex-col justify-between rounded-3xl bg-white p-5 text-black transition hover:bg-white/90"
            >
              <BrainIcon className="size-6" />

              <div>
                <p className="text-lg font-semibold">
                  Открыть AI Center
                </p>

                <p className="mt-1 text-sm text-black/55">
                  Начать новый диалог →
                </p>
              </div>
            </Link>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="lh-card p-6 sm:p-7">
            <p className="lh-eyebrow">
              Быстрые действия
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
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

          <div className="lh-card p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="lh-eyebrow">Журнал</p>

                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                  Последняя активность
                </h2>
              </div>
            </div>

            <div className="lh-empty mt-6 min-h-56">
              <CalendarIcon className="size-7 text-white/28" />

              <h3 className="mt-4 text-lg font-semibold text-white">
                Действий пока нет
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/38">
                Здесь будут отображаться реальные изменения
                в CRM, Wiki, Team, Finance и Calendar.
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}