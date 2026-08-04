import Link from "next/link"
import { notFound } from "next/navigation"

import { CandidateProfileClient } from "@/components/crm/candidate-profile-client"
import { BrainIcon, CalendarIcon, TeamIcon, UsersIcon } from "@/components/icons"
import { DashboardShell } from "@/components/layout/shell"
import { requireUser } from "@/lib/auth"
import { db, ensureCrmSchema } from "@/lib/db"

type CandidateRow = {
  id: string
  name: string
  username: string
  country: string
  source: string
  mentor: string
  status: string
  priority: string
  score: number
  last_activity: string
  next_action: string
  note: string
  next_contact_at: string | null
  created_at: string
  updated_at: string
}

type PageProps = { params: Promise<{ id: string }> }

const statusLabels: Record<string, string> = {
  new: "Новые",
  contact: "В работе",
  call: "Созвон",
  training: "Обучение",
  active: "Активные",
}

const priorityLabels: Record<string, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
}

function formatDate(value: string | null) {
  if (!value) return "Не назначено"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Некорректная дата"
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default async function CandidatePage({ params }: PageProps) {
  const currentUser = await requireUser()
  await ensureCrmSchema()

  const { id } = await params
  const candidateId = Number(id)

  if (!Number.isSafeInteger(candidateId) || candidateId <= 0) notFound()

  const result = await db.query<CandidateRow>(
    `
      SELECT
        id::text, name, username, country, source, mentor, status, priority,
        score, last_activity, next_action, note, next_contact_at::text,
        created_at::text, updated_at::text
      FROM legionhunt_candidates
      WHERE id = $1
      LIMIT 1
    `,
    [candidateId],
  )

  const candidate = result.rows[0]
  if (!candidate) notFound()

  const displayName =
    currentUser.fullName?.trim() ||
    currentUser.email?.split("@")[0] ||
    "LegionHunt User"

  const serializedCandidate = {
    id: Number(candidate.id),
    name: candidate.name,
    username: candidate.username,
    country: candidate.country,
    source: candidate.source,
    mentor: candidate.mentor,
    status: candidate.status,
    priority: candidate.priority,
    score: candidate.score,
    lastActivity: candidate.last_activity,
    nextAction: candidate.next_action,
    note: candidate.note,
    nextContactAt: candidate.next_contact_at,
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6">
          <Link href="/crm" className="text-sm text-white/35 transition hover:text-white">← Вернуться в CRM</Link>
        </div>

        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-bold text-white">
                {candidate.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/65">Карточка кандидата</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-[42px]">{candidate.name}</h1>
                <p className="mt-2 text-sm text-white/35">{candidate.username || "Telegram не указан"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-white/55">{statusLabels[candidate.status] ?? candidate.status}</span>
                  <span className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-white/55">Приоритет: {priorityLabels[candidate.priority] ?? candidate.priority}</span>
                  <span className="rounded-lg bg-violet-400/10 px-3 py-1.5 text-xs text-violet-200">AI Score {candidate.score}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[520px]">
              <StatCard label="Этап" value={statusLabels[candidate.status] ?? candidate.status} icon={<UsersIcon className="size-4" />} />
              <StatCard label="Наставник" value={candidate.mentor || "Не назначен"} icon={<TeamIcon className="size-4" />} />
              <StatCard label="AI Score" value={`${candidate.score}%`} icon={<BrainIcon className="size-4" />} />
              <StatCard label="Контакт" value={formatDate(candidate.next_contact_at)} icon={<CalendarIcon className="size-4" />} />
            </div>
          </div>
        </section>

        <CandidateProfileClient candidate={serializedCandidate} displayName={displayName} />
      </div>
    </DashboardShell>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
      <div className="flex size-8 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-violet-200">{icon}</div>
      <p className="mt-4 text-[10px] uppercase tracking-[0.15em] text-white/22">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-white">{value}</p>
    </article>
  )
}
