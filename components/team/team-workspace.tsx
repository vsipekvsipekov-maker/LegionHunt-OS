"use client"

import { useEffect, useMemo, useState } from "react"

type Member = {
  id: string
  displayName: string
  username: string
  email: string
  status: "online" | "offline" | "vacation" | "inactive"
  kpi: number
  positionTitle: string
  bio: string
  role: string | null
  department: string | null
  mentorName: string | null
  mentorId: string | null
  mentees: number
  academyProgress: number
}

type MetaItem = { id: string; name: string; color?: string }
type Detail = {
  member: Member & { roleId: string | null; departmentId: string | null; joinedAt: string; lastSeenAt: string }
  activity: Array<{ id: string; eventType: string; title: string; description: string; createdAt: string }>
  notes: Array<{ id: string; author: string; body: string; createdAt: string }>
  academy: Array<{ title: string; progress: number; completed: boolean }>
  certificates: Array<{ title: string; certificateCode: string; issuedAt: string }>
  achievements: Array<{ id: string; achievementKey: string; title: string; description: string; icon: string; awardedAt: string }>
  kpiHistory: Array<{ value: number; source: string; recordedAt: string }>
  summary: string
}

const statusLabel = { online: "Онлайн", offline: "Оффлайн", vacation: "В отпуске", inactive: "Неактивен" }
const statusClass = {
  online: "bg-emerald-400",
  offline: "bg-white/25",
  vacation: "bg-amber-400",
  inactive: "bg-rose-400",
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "LH"
}

function StatCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <p className="text-xs uppercase tracking-[0.16em] text-white/28">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-2 text-xs text-white/30">{note}</p>
    </div>
  )
}

export function TeamWorkspace() {
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState({ total: 0, online: 0, mentors: 0, students: 0, average_kpi: 0, averageProgress: 0 })
  const [activity, setActivity] = useState<Array<{ id: string; title: string; description: string; memberName: string; createdAt: string }>>([])
  const [roles, setRoles] = useState<MetaItem[]>([])
  const [departments, setDepartments] = useState<MetaItem[]>([])
  const [mentors, setMentors] = useState<MetaItem[]>([])
  const [query, setQuery] = useState("")
  const [role, setRole] = useState("")
  const [department, setDepartment] = useState("")
  const [status, setStatus] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadOverview() {
    const response = await fetch("/api/team/overview", { cache: "no-store" })
    if (!response.ok) throw new Error("overview")
    const data = await response.json()
    setStats(data.stats)
    setActivity(data.activity)
  }

  async function loadMeta() {
    const response = await fetch("/api/team/meta", { cache: "no-store" })
    if (!response.ok) throw new Error("meta")
    const data = await response.json()
    setRoles(data.roles)
    setDepartments(data.departments)
    setMentors(data.mentors)
  }

  async function loadMembers() {
    const params = new URLSearchParams({ q: query, role, department, status })
    const response = await fetch(`/api/team/members?${params}`, { cache: "no-store" })
    if (!response.ok) throw new Error("members")
    const data = await response.json()
    setMembers(data.members)
  }

  async function loadDetail(id: string) {
    setSelectedId(id)
    const response = await fetch(`/api/team/members/${id}`, { cache: "no-store" })
    if (!response.ok) throw new Error("detail")
    setDetail(await response.json())
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      Promise.all([loadOverview(), loadMeta(), loadMembers()])
        .catch(console.error)
        .finally(() => setLoading(false))
    }, 0)
    return () => window.clearTimeout(timeout)
    // Initial load is intentionally executed once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => loadMembers().catch(console.error), 250)
    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, role, department, status])

  const topMembers = useMemo(() => [...members].sort((a, b) => b.kpi - a.kpi).slice(0, 4), [members])

  async function saveMember() {
    if (!detail) return
    setSaving(true)
    try {
      const response = await fetch(`/api/team/members/${detail.member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detail.member),
      })
      if (!response.ok) throw new Error("save")
      await Promise.all([loadMembers(), loadOverview(), loadDetail(detail.member.id)])
    } finally {
      setSaving(false)
    }
  }

  async function addNote() {
    if (!detail || !note.trim()) return
    const response = await fetch(`/api/team/members/${detail.member.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: note }),
    })
    if (!response.ok) return
    setNote("")
    await Promise.all([loadDetail(detail.member.id), loadOverview()])
  }

  if (loading) return <div className="p-10 text-sm text-white/45">Загрузка Team Center...</div>

  return (
    <div className="min-h-[calc(100vh-80px)] px-5 py-7 md:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl shadow-[0_0_35px_rgba(139,92,246,.25)]">👥</div>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">Team Center</h1>
              <p className="mt-1 text-sm text-white/35">Участники, роли, наставники и прогресс команды</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.07]">Оргструктура</button>
          <button className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_25px_rgba(139,92,246,.25)]">+ Участник</button>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Участников" value={stats.total} note="в системе" />
        <StatCard label="Онлайн" value={stats.online} note="сейчас активны" />
        <StatCard label="Наставников" value={stats.mentors} note="ведут учеников" />
        <StatCard label="Учеников" value={stats.students} note="на обучении" />
        <StatCard label="Средний KPI" value={`${stats.average_kpi}%`} note="по всей команде" />
        <StatCard label="Academy" value={`${stats.averageProgress}%`} note="средний прогресс" />
      </div>

      <div className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0e14]/90">
          <div className="border-b border-white/[0.065] p-4">
            <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_160px_170px_150px]">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск участника..." className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-400/45" />
              <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-2.5 text-sm text-white/65 outline-none"><option value="">Все роли</option>{roles.map((item) => <option key={item.id}>{item.name}</option>)}</select>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-2.5 text-sm text-white/65 outline-none"><option value="">Все отделы</option>{departments.map((item) => <option key={item.id}>{item.name}</option>)}</select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-2.5 text-sm text-white/65 outline-none"><option value="">Все статусы</option>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-white/[0.055] text-[10px] uppercase tracking-[0.16em] text-white/24">
                <tr><th className="px-5 py-4 font-medium">Участник</th><th className="px-4 py-4 font-medium">Роль / отдел</th><th className="px-4 py-4 font-medium">Наставник</th><th className="px-4 py-4 font-medium">Academy</th><th className="px-4 py-4 font-medium">KPI</th><th className="px-5 py-4 font-medium">Статус</th></tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} onClick={() => loadDetail(member.id)} className="cursor-pointer border-b border-white/[0.045] transition hover:bg-white/[0.035]">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/35 to-fuchsia-500/20 text-xs font-semibold text-violet-100">{initials(member.displayName)}</div><div><p className="text-sm font-medium text-white/88">{member.displayName}</p><p className="mt-0.5 text-xs text-white/28">{member.username || member.email}</p></div></div></td>
                    <td className="px-4 py-4"><p className="text-sm text-white/72">{member.role ?? "—"}</p><p className="mt-1 text-xs text-white/28">{member.department ?? "Без отдела"}</p></td>
                    <td className="px-4 py-4 text-sm text-white/55">{member.mentorName ?? "—"}</td>
                    <td className="px-4 py-4"><div className="flex items-center gap-3"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-violet-400" style={{ width: `${member.academyProgress}%` }} /></div><span className="text-xs text-white/45">{member.academyProgress}%</span></div></td>
                    <td className="px-4 py-4"><span className={member.kpi >= 85 ? "text-emerald-300" : member.kpi >= 70 ? "text-amber-300" : "text-rose-300"}>{member.kpi}%</span></td>
                    <td className="px-5 py-4"><div className="flex items-center gap-2 text-xs text-white/45"><span className={`size-2 rounded-full ${statusClass[member.status]}`} />{statusLabel[member.status]}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <h2 className="text-sm font-semibold text-white/82">Лучшие результаты</h2>
            <div className="mt-4 space-y-3">{topMembers.map((member, index) => <button key={member.id} onClick={() => loadDetail(member.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.04]"><span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/12 text-xs text-violet-300">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm text-white/72">{member.displayName}</span><span className="block text-xs text-white/25">{member.role}</span></span><span className="text-sm font-medium text-emerald-300">{member.kpi}%</span></button>)}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"><h2 className="text-sm font-semibold text-white/82">Последняя активность</h2><div className="mt-4 space-y-4">{activity.slice(0, 6).map((item) => <div key={item.id} className="border-l border-violet-400/25 pl-3"><p className="text-xs text-violet-300/75">{item.memberName}</p><p className="mt-1 text-sm text-white/65">{item.title}</p><p className="mt-1 line-clamp-2 text-xs text-white/25">{item.description}</p></div>)}</div></div>
        </aside>
      </div>

      {selectedId && detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-sm" onMouseDown={(e) => { if (e.currentTarget === e.target) { setSelectedId(null); setDetail(null) } }}>
          <div className="h-full w-full max-w-[620px] overflow-y-auto border-l border-white/[0.08] bg-[#0a0d13] p-6 shadow-2xl">
            <div className="flex items-start justify-between"><div className="flex items-center gap-4"><div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/50 to-fuchsia-500/25 text-lg font-semibold text-white">{initials(detail.member.displayName)}</div><div><h2 className="text-xl font-semibold text-white">{detail.member.displayName}</h2><p className="mt-1 text-sm text-white/35">{detail.member.positionTitle || detail.member.role}</p></div></div><button onClick={() => { setSelectedId(null); setDetail(null) }} className="rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-white/40 hover:text-white">✕</button></div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-white/30">Имя<input value={detail.member.displayName} onChange={(e) => setDetail({ ...detail, member: { ...detail.member, displayName: e.target.value } })} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-sm text-white outline-none" /></label>
              <label className="text-xs text-white/30">Username<input value={detail.member.username} onChange={(e) => setDetail({ ...detail, member: { ...detail.member, username: e.target.value } })} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-sm text-white outline-none" /></label>
              <label className="text-xs text-white/30">Роль<select value={detail.member.roleId ?? ""} onChange={(e) => setDetail({ ...detail, member: { ...detail.member, roleId: e.target.value } })} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-2.5 text-sm text-white outline-none">{roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="text-xs text-white/30">Отдел<select value={detail.member.departmentId ?? ""} onChange={(e) => setDetail({ ...detail, member: { ...detail.member, departmentId: e.target.value } })} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-2.5 text-sm text-white outline-none">{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="text-xs text-white/30">Наставник<select value={detail.member.mentorId ?? ""} onChange={(e) => setDetail({ ...detail, member: { ...detail.member, mentorId: e.target.value } })} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-2.5 text-sm text-white outline-none"><option value="">Без наставника</option>{mentors.filter((item) => item.id !== detail.member.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="text-xs text-white/30">Статус<select value={detail.member.status} onChange={(e) => setDetail({ ...detail, member: { ...detail.member, status: e.target.value as Member["status"] } })} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-2.5 text-sm text-white outline-none">{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <label className="text-xs text-white/30 sm:col-span-2">KPI — {detail.member.kpi}%<input type="range" min="0" max="100" value={detail.member.kpi} onChange={(e) => setDetail({ ...detail, member: { ...detail.member, kpi: Number(e.target.value) } })} className="mt-3 w-full accent-violet-500" /></label>
              <label className="text-xs text-white/30 sm:col-span-2">О себе<textarea value={detail.member.bio} onChange={(e) => setDetail({ ...detail, member: { ...detail.member, bio: e.target.value } })} rows={3} className="mt-2 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-sm text-white outline-none" /></label>
            </div>
            <button onClick={saveMember} disabled={saving} className="mt-4 w-full rounded-xl bg-violet-500 py-3 text-sm font-medium text-white disabled:opacity-50">{saving ? "Сохранение..." : "Сохранить профиль"}</button>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="text-xs uppercase tracking-[.14em] text-white/25">AI Summary</p>
                <p className="mt-3 text-sm leading-6 text-white/55">{detail.summary}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/[0.035] p-3 text-center"><p className="text-lg font-semibold text-white">{detail.member.mentees ?? 0}</p><p className="text-[10px] text-white/25">подопечных</p></div>
                  <div className="rounded-xl bg-white/[0.035] p-3 text-center"><p className="text-lg font-semibold text-white">{detail.certificates.length}</p><p className="text-[10px] text-white/25">сертификатов</p></div>
                  <div className="rounded-xl bg-white/[0.035] p-3 text-center"><p className="text-lg font-semibold text-white">{detail.achievements.length}</p><p className="text-[10px] text-white/25">достижений</p></div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="text-xs uppercase tracking-[.14em] text-white/25">Academy</p>
                <div className="mt-3 space-y-3">{detail.academy.length ? detail.academy.map((course) => <div key={course.title}><div className="flex justify-between text-xs text-white/45"><span>{course.title}</span><span>{course.completed ? "✓" : `${course.progress}%`}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full bg-violet-400" style={{ width: `${course.progress}%` }} /></div></div>) : <p className="text-sm text-white/30">Нет активных курсов</p>}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-white/75">Достижения</h3><span className="text-xs text-white/25">{detail.achievements.length}</span></div>
                <div className="mt-4 space-y-3">{detail.achievements.length ? detail.achievements.map((item) => <div key={item.id} className="flex gap-3 rounded-xl bg-white/[0.03] p-3"><span className="text-xl">{item.icon}</span><div><p className="text-sm text-white/70">{item.title}</p><p className="mt-1 text-xs text-white/28">{item.description}</p></div></div>) : <p className="text-sm text-white/30">Достижений пока нет</p>}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-white/75">Сертификаты</h3><span className="text-xs text-white/25">{detail.certificates.length}</span></div>
                <div className="mt-4 space-y-3">{detail.certificates.length ? detail.certificates.map((item) => <div key={item.certificateCode} className="rounded-xl bg-white/[0.03] p-3"><p className="text-sm text-white/70">🎓 {item.title}</p><p className="mt-1 text-[11px] text-white/25">{item.certificateCode} • {new Date(item.issuedAt).toLocaleDateString("ru-RU")}</p></div>) : <p className="text-sm text-white/30">Сертификатов пока нет</p>}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-white/75">Динамика KPI</h3><span className="text-xs text-white/25">последние изменения</span></div>
              <div className="mt-4 flex h-28 items-end gap-2">{detail.kpiHistory.length ? detail.kpiHistory.map((point, index) => <div key={`${point.recordedAt}-${index}`} className="group flex min-w-0 flex-1 flex-col items-center gap-2"><div title={`${point.value}%`} className="w-full rounded-t-md bg-gradient-to-t from-violet-600 to-fuchsia-400 transition group-hover:brightness-125" style={{ height: `${Math.max(8, point.value)}%` }} /><span className="text-[9px] text-white/20">{point.value}</span></div>) : <p className="self-center text-sm text-white/30">История KPI появится после первого изменения</p>}</div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><h3 className="text-sm font-semibold text-white/75">Заметки руководителя</h3><div className="mt-3 flex gap-2"><input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNote() }} placeholder="Добавить заметку..." className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/20" /><button onClick={addNote} className="rounded-xl bg-white/[0.08] px-4 text-sm text-white/70">Добавить</button></div><div className="mt-4 space-y-3">{detail.notes.map((item) => <div key={item.id} className="rounded-xl bg-white/[0.03] p-3"><p className="text-sm text-white/58">{item.body}</p><p className="mt-2 text-[11px] text-white/20">{item.author} • {new Date(item.createdAt).toLocaleString("ru-RU")}</p></div>)}</div></div>

            <div className="mt-6"><h3 className="text-sm font-semibold text-white/75">История активности</h3><div className="mt-4 space-y-4">{detail.activity.map((item) => <div key={item.id} className="relative border-l border-violet-400/20 pl-4"><span className="absolute -left-1 top-1 size-2 rounded-full bg-violet-400" /><p className="text-sm text-white/65">{item.title}</p><p className="mt-1 text-xs text-white/28">{item.description}</p><p className="mt-1 text-[10px] text-white/18">{new Date(item.createdAt).toLocaleString("ru-RU")}</p></div>)}</div></div>
          </div>
        </div>
      )}
    </div>
  )
}
