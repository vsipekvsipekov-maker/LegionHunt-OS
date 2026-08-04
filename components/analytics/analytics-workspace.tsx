"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type Metrics = {
  teamTotal: number
  teamOnline: number
  averageKpi: number
  academyProgress: number
  completedLessons: number
  certificates: number
  wikiArticles: number
  wikiViews: number
  aiRequests: number
  unanswered: number
  crmCandidates: number
}

type PeriodMetric = { current: number; previous: number; change: number }
type PeriodData = Record<"team" | "academy" | "wiki" | "ai" | "crm", PeriodMetric>
type FunnelItem = { key: string; label: string; value: number }
type EventItem = { id: string; source: string; type: string; title: string; description: string; createdAt: string; actor: string }
type Leader = { id: string; displayName: string; positionTitle: string; role: string; kpi: number; academyProgress: number }
type Article = { id: string; title: string; category: string; views: number }
type Point = { label: string; value: number }
type SourceKey = "all" | "team" | "crm" | "academy" | "wiki" | "ai"

type OverviewResponse = {
  metrics: Metrics
  period: PeriodData
  funnel: FunnelItem[]
  leaders: Leader[]
  popularArticles: Article[]
}

const sourceStyle: Record<string, string> = {
  Team: "bg-violet-400/10 text-violet-300 border-violet-400/15",
  CRM: "bg-blue-400/10 text-blue-300 border-blue-400/15",
  Academy: "bg-emerald-400/10 text-emerald-300 border-emerald-400/15",
  Wiki: "bg-amber-400/10 text-amber-300 border-amber-400/15",
  AI: "bg-fuchsia-400/10 text-fuchsia-300 border-fuchsia-400/15",
}

const sourceLabels: Record<SourceKey, string> = {
  all: "Все модули",
  team: "Team",
  crm: "CRM",
  academy: "Academy",
  wiki: "Wiki",
  ai: "AI",
}

function changeClass(change: number) {
  if (change > 0) return "text-emerald-300"
  if (change < 0) return "text-rose-300"
  return "text-white/30"
}

function MetricCard({
  label,
  value,
  note,
  accent,
  change,
  onClick,
}: {
  label: string
  value: string | number
  note: string
  accent: string
  change?: number
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-left transition hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-white/[0.045]"
    >
      <span className={`absolute inset-x-0 top-0 h-px ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">{label}</p>
        {change !== undefined && (
          <span className={`text-[10px] font-semibold ${changeClass(change)}`}>
            {change > 0 ? "▲" : change < 0 ? "▼" : "•"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{value}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-white/28">{note}</p>
        <span className="translate-x-1 text-xs text-white/0 transition group-hover:translate-x-0 group-hover:text-white/35">→</span>
      </div>
    </button>
  )
}

function ActivityChart({ points }: { points: Point[] }) {
  const width = 760
  const height = 220
  const padding = 18
  const max = Math.max(...points.map((point) => Number(point.value)), 1)
  const denominator = Math.max(points.length - 1, 1)
  const chartPoints = points.map((point, index) => ({
    ...point,
    x: padding + (index / denominator) * (width - padding * 2),
    y: height - padding - (Number(point.value) / max) * (height - padding * 2),
  }))
  const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(" ")
  const area = chartPoints.length > 0
    ? `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`
    : ""

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.045] bg-black/10 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[250px] w-full" role="img" aria-label="График активности">
        <defs>
          <linearGradient id="analytics-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(168 85 247)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(168 85 247)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="analytics-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgb(139 92 246)" />
            <stop offset="100%" stopColor="rgb(244 114 182)" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line key={ratio} x1={padding} x2={width - padding} y1={height * ratio} y2={height * ratio} stroke="rgba(255,255,255,.05)" />
        ))}
        {area && <polygon points={area} fill="url(#analytics-area)" />}
        {polyline && <polyline points={polyline} fill="none" stroke="url(#analytics-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
        {chartPoints.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="rgb(216 180 254)" stroke="rgb(88 28 135)" strokeWidth="2" />
            {(index === 0 || index === chartPoints.length - 1 || index % Math.ceil(points.length / 7) === 0) && (
              <text x={point.x} y={height - 2} textAnchor="middle" fill="rgba(255,255,255,.25)" fontSize="10">{point.label}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

export function AnalyticsWorkspace() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [period, setPeriod] = useState<PeriodData | null>(null)
  const [funnel, setFunnel] = useState<FunnelItem[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [points, setPoints] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [days, setDays] = useState(14)
  const [source, setSource] = useState<SourceKey>("all")
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)

    try {
      const [overviewResponse, activityResponse, trendsResponse] = await Promise.all([
        fetch(`/api/analytics/overview?days=${days}`, { cache: "no-store" }),
        fetch("/api/analytics/activity?limit=40", { cache: "no-store" }),
        fetch(`/api/analytics/trends?days=${days}&source=${source}`, { cache: "no-store" }),
      ])

      if (!overviewResponse.ok) throw new Error("Overview request failed")

      const overview = (await overviewResponse.json()) as OverviewResponse
      const activity = await activityResponse.json()
      const trends = await trendsResponse.json()

      setMetrics(overview.metrics)
      setPeriod(overview.period)
      setFunnel(overview.funnel ?? [])
      setLeaders(overview.leaders ?? [])
      setArticles(overview.popularArticles ?? [])
      setEvents(activity.events ?? [])
      setPoints(trends.points ?? [])
      setUpdatedAt(new Date())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [days, source])

  useEffect(() => {
    // Initial data load is intentionally triggered when the selected period/source changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()
  }, [loadData])

  const maxArticle = useMemo(() => Math.max(...articles.map((article) => Number(article.views)), 1), [articles])
  const maxFunnel = useMemo(() => Math.max(...funnel.map((item) => Number(item.value)), 1), [funnel])

  if (loading || !metrics || !period) {
    return <div className="p-10 text-sm text-white/40">Загрузка Analytics Center...</div>
  }

  return (
    <div className="min-h-[calc(100vh-80px)] px-5 py-7 md:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl shadow-[0_0_35px_rgba(139,92,246,.25)]">📊</div>
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">Analytics Center</h1>
            <p className="mt-1 text-sm text-white/35">Executive Intelligence для Team, Academy, Wiki, AI и CRM</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {updatedAt && <span className="mr-1 text-[10px] text-white/20">Обновлено {updatedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>}
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-xl border border-white/[0.08] bg-[#11151d] px-4 py-2.5 text-sm text-white/60 outline-none">
            <option value={7}>7 дней</option>
            <option value={14}>14 дней</option>
            <option value={30}>30 дней</option>
          </select>
          <button onClick={() => void loadData(true)} disabled={refreshing} className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-sm text-white/65 hover:bg-white/[0.07] disabled:opacity-50">
            {refreshing ? "Обновление..." : "Обновить"}
          </button>
          <button onClick={() => window.print()} className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-sm text-white/65 hover:bg-white/[0.07]">Экспорт</button>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Команда" value={metrics.teamTotal} note={`${metrics.teamOnline} онлайн • +${period.team.current} за период`} accent="bg-violet-400" change={period.team.change} onClick={() => router.push("/team")} />
        <MetricCard label="Средний KPI" value={`${metrics.averageKpi}%`} note="по всей команде" accent="bg-blue-400" onClick={() => router.push("/team")} />
        <MetricCard label="Academy" value={`${metrics.academyProgress}%`} note={`${period.academy.current} завершений за период`} accent="bg-emerald-400" change={period.academy.change} onClick={() => router.push("/academy")} />
        <MetricCard label="Wiki" value={metrics.wikiViews} note={`${period.wiki.current} просмотров за период`} accent="bg-amber-400" change={period.wiki.change} onClick={() => router.push("/wiki")} />
        <MetricCard label="AI Requests" value={metrics.aiRequests} note={`${period.ai.current} запросов за период`} accent="bg-fuchsia-400" change={period.ai.change} onClick={() => router.push("/ai")} />
        <MetricCard label="CRM" value={metrics.crmCandidates} note={`${period.crm.current} новых за период`} accent="bg-rose-400" change={period.crm.change} onClick={() => router.push("/crm")} />
      </div>

      <div className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,.55fr)]">
        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0e14]/90 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white/85">Активность системы</h2>
              <p className="mt-1 text-xs text-white/28">События за последние {days} дней</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(sourceLabels) as SourceKey[]).map((key) => (
                <button key={key} onClick={() => setSource(key)} className={`rounded-lg border px-2.5 py-1.5 text-[10px] transition ${source === key ? "border-violet-400/25 bg-violet-400/10 text-violet-200" : "border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/55"}`}>
                  {sourceLabels[key]}
                </button>
              ))}
            </div>
          </div>
          <ActivityChart points={points} />
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0e14]/90 p-5">
          <div className="flex items-center justify-between">
            <div><h2 className="text-base font-semibold text-white/85">Live Activity</h2><p className="mt-1 text-xs text-white/25">Последние действия модулей</p></div>
            <span className="rounded-lg bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-semibold text-emerald-300">LIVE DATA</span>
          </div>
          <div className="mt-4 max-h-[330px] space-y-3 overflow-y-auto pr-1">
            {events.slice(0, 8).map((event) => (
              <div key={event.id} className="rounded-xl border border-white/[0.045] bg-white/[0.018] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold ${sourceStyle[event.source] ?? "border-white/10 text-white/40"}`}>{event.source}</span>
                  <span className="text-[9px] text-white/18">{new Date(event.createdAt).toLocaleString("ru-RU")}</span>
                </div>
                <p className="mt-2 text-sm text-white/65">{event.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-white/28">{event.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0e14]/90 p-5">
          <h2 className="text-base font-semibold text-white/85">CRM Funnel</h2>
          <p className="mt-1 text-xs text-white/25">Распределение кандидатов по этапам</p>
          <div className="mt-5 space-y-4">
            {funnel.map((item) => (
              <button key={item.key} onClick={() => router.push("/crm")} className="block w-full text-left">
                <div className="flex items-center justify-between"><span className="text-sm text-white/55">{item.label}</span><span className="text-sm font-semibold text-white/80">{item.value}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.045]"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-400" style={{ width: `${Math.max((item.value / maxFunnel) * 100, item.value > 0 ? 4 : 0)}%` }} /></div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0e14]/90 p-5">
          <h2 className="text-base font-semibold text-white/85">AI Insights</h2>
          <p className="mt-1 text-xs text-white/25">Автоматические выводы по текущим данным</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl border border-violet-400/10 bg-violet-400/[0.04] p-4 text-white/55">
              <b className="text-white/85">KPI {metrics.averageKpi}%.</b> {metrics.averageKpi >= 80 ? "Команда находится в здоровой зоне." : "Стоит проверить участников с низким показателем."}
            </div>
            <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4 text-white/55">
              <b className="text-white/85">Academy {metrics.academyProgress}%.</b> За период завершено {period.academy.current} уроков, изменение {period.academy.change}%.
            </div>
            <div className="rounded-xl border border-fuchsia-400/10 bg-fuchsia-400/[0.04] p-4 text-white/55">
              <b className="text-white/85">AI: {period.ai.current} запросов.</b> В очереди обучения сейчас {metrics.unanswered} вопросов.
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0e14]/90 p-5">
          <h2 className="text-base font-semibold text-white/85">Academy Progress</h2>
          <p className="mt-1 text-xs text-white/25">Сводка обучения команды</p>
          <div className="mt-6 flex items-end justify-between gap-4"><span className="text-5xl font-semibold tracking-[-0.06em] text-white">{metrics.academyProgress}%</span><span className="text-xs text-white/25">средний прогресс</span></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.045]"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${Math.min(metrics.academyProgress, 100)}%` }} /></div>
          <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/[0.025] p-3"><p className="text-2xl font-semibold text-white/85">{metrics.completedLessons}</p><p className="mt-1 text-[10px] text-white/25">уроков завершено</p></div><div className="rounded-xl bg-white/[0.025] p-3"><p className="text-2xl font-semibold text-white/85">{metrics.certificates}</p><p className="mt-1 text-[10px] text-white/25">сертификатов</p></div></div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0e14]/90 p-5">
          <h2 className="text-base font-semibold text-white/85">Leaderboard</h2><p className="mt-1 text-xs text-white/25">Лучшие участники по KPI</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{leaders.map((leader, index) => <button type="button" onClick={() => router.push(`/team?member=${leader.id}`)} key={leader.id} className="flex items-center gap-3 rounded-xl bg-white/[0.025] p-3 text-left transition hover:bg-white/[0.05]"><div className="flex size-8 items-center justify-center rounded-lg bg-violet-400/10 text-xs font-semibold text-violet-300">#{index + 1}</div><div className="min-w-0 flex-1"><p className="truncate text-sm text-white/70">{leader.displayName}</p><p className="text-[10px] text-white/25">{leader.role} • Academy {leader.academyProgress}%</p></div><span className="text-sm font-semibold text-emerald-300">{leader.kpi}%</span></button>)}</div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0e14]/90 p-5">
          <h2 className="text-base font-semibold text-white/85">Популярные статьи</h2><p className="mt-1 text-xs text-white/25">По реальным просмотрам Wiki</p>
          <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">{articles.map((article) => <button type="button" onClick={() => router.push(`/wiki?article=${article.id}`)} key={article.id} className="text-left"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm text-white/65">{article.title}</p><p className="text-[10px] text-white/22">{article.category}</p></div><span className="text-xs text-white/35">{article.views}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.045]"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400" style={{ width: `${(Number(article.views) / maxArticle) * 100}%` }} /></div></button>)}</div>
        </section>
      </div>
    </div>
  )
}
