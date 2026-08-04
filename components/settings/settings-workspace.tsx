"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type Settings = {
  displayName: string
  username: string
  email: string
  role: string
  language: string
  timezone: string
  theme: string
  accent: string
  compact: boolean
  animations: boolean
  browserNotifications: boolean
  emailNotifications: boolean
  telegramNotifications: boolean
  dailyDigest: boolean
  aiModel: string
  aiTemperature: number
  aiMaxTokens: number
}

type Status = {
  database: { ok: boolean; latency: number; message: string }
  ai: { ok: boolean; model: string; message: string }
  app: { version: string; next: string; environment: string; checkedAt: string; latency: number }
}

const tabs = ["Профиль", "Интерфейс", "AI", "Уведомления", "Система"] as const

const initial: Settings = {
  displayName: "VSIPEK", username: "vsipek", email: "", role: "Leader", language: "ru",
  timezone: "Europe/Vilnius", theme: "dark", accent: "violet", compact: false, animations: true,
  browserNotifications: true, emailNotifications: false, telegramNotifications: false, dailyDigest: true,
  aiModel: "gemini-3.6-flash", aiTemperature: 0.45, aiMaxTokens: 1200,
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
    <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">{title}</h2>
    {description && <p className="mt-1 text-sm text-white/35">{description}</p>}
    <div className="mt-5">{children}</div>
  </section>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/28">{label}</span>{children}</label>
}

const inputClass = "h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/35"

function Toggle({ value, onChange, label, note }: { value: boolean; onChange: (value: boolean) => void; label: string; note: string }) {
  return <button type="button" onClick={() => onChange(!value)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-black/10 p-4 text-left">
    <span><span className="block text-sm text-white/78">{label}</span><span className="mt-1 block text-xs text-white/28">{note}</span></span>
    <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-white" : "bg-white/10"}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition ${value ? "left-6" : "left-1"}`} /></span>
  </button>
}

export function SettingsWorkspace() {
  const [active, setActive] = useState<(typeof tabs)[number]>("Профиль")
  const [settings, setSettings] = useState<Settings>(initial)
  const [runtimeModel, setRuntimeModel] = useState("gemini-3.6-flash")
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/settings", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error)
      setSettings(payload.settings)
      setRuntimeModel(payload.runtimeModel)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки")
    } finally { setLoading(false) }
  }, [])

  const checkStatus = useCallback(async () => {
    setMessage("")
    try {
      const response = await fetch("/api/settings/status", { cache: "no-store" })
      setStatus(await response.json())
    } catch { setMessage("Не удалось проверить состояние системы.") }
  }, [])

  // Initial data is loaded from two external API endpoints.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); void checkStatus() }, [load, checkStatus])

  async function save() {
    setSaving(true); setMessage("")
    try {
      const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error)
      setMessage("Настройки сохранены")
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ошибка сохранения") }
    finally { setSaving(false) }
  }

  const initials = useMemo(() => settings.displayName.split(/\s+/).map(v => v[0]).join("").slice(0, 2).toUpperCase() || "LH", [settings.displayName])

  if (loading) return <div className="py-24 text-center text-sm text-white/35">Загрузка Settings Center...</div>

  return <div className="space-y-6">
    <div className="flex flex-col gap-5 border-b border-white/[0.06] pb-6 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">LEGIONHUNT CONTROL CENTER</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] text-white sm:text-5xl">Settings</h1><p className="mt-3 max-w-2xl text-sm text-white/35">Профиль, интерфейс, AI, уведомления и состояние системы в одном месте.</p></div>
      <button onClick={save} disabled={saving} className="h-11 rounded-xl bg-white px-5 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(139,92,246,.28)] transition hover:bg-violet-400 disabled:opacity-50">{saving ? "Сохранение..." : "Сохранить изменения"}</button>
    </div>

    {message && <div className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white/75">{message}</div>}

    <div className="flex gap-2 overflow-x-auto pb-1">{tabs.map(tab => <button key={tab} onClick={() => setActive(tab)} className={`h-10 shrink-0 rounded-xl border px-4 text-sm transition ${active === tab ? "border-violet-400/30 bg-white/15 text-white" : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:text-white/75"}`}>{tab}</button>)}</div>

    {active === "Профиль" && <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card title="Аккаунт"><div className="flex flex-col items-center text-center"><div className="flex size-24 items-center justify-center rounded-3xl border border-white/20 bg-white text-2xl font-bold text-black">{initials}</div><p className="mt-4 text-xl font-semibold text-white">{settings.displayName}</p><p className="mt-1 text-sm text-white/35">{settings.role}</p><span className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[10px] font-semibold text-emerald-300">ACTIVE SESSION</span></div></Card>
      <Card title="Данные профиля" description="Основная информация владельца рабочего пространства"><div className="grid gap-4 sm:grid-cols-2"><Field label="Имя"><input className={inputClass} value={settings.displayName} onChange={e => setSettings({...settings, displayName:e.target.value})}/></Field><Field label="Username"><input className={inputClass} value={settings.username} onChange={e => setSettings({...settings, username:e.target.value})}/></Field><Field label="Email"><input type="email" className={inputClass} value={settings.email} onChange={e => setSettings({...settings, email:e.target.value})} placeholder="name@example.com"/></Field><Field label="Роль"><input className={inputClass} value={settings.role} onChange={e => setSettings({...settings, role:e.target.value})}/></Field><Field label="Язык"><select className={inputClass} value={settings.language} onChange={e => setSettings({...settings, language:e.target.value})}><option value="ru">Русский</option><option value="en">English</option></select></Field><Field label="Часовой пояс"><select className={inputClass} value={settings.timezone} onChange={e => setSettings({...settings, timezone:e.target.value})}><option>Europe/Vilnius</option><option>Europe/Moscow</option><option>Europe/Warsaw</option><option>UTC</option></select></Field></div></Card>
    </div>}

    {active === "Интерфейс" && <div className="grid gap-5 xl:grid-cols-2"><Card title="Внешний вид" description="Настрой внешний вид LegionHunt OS"><div className="grid gap-4"><Field label="Тема"><select className={inputClass} value={settings.theme} onChange={e => setSettings({...settings, theme:e.target.value})}><option value="dark">Dark</option><option value="system">System</option><option value="light">Light (preview)</option></select></Field><Field label="Акцент"><div className="grid grid-cols-4 gap-3">{["violet","blue","emerald","rose"].map(color => <button key={color} onClick={() => setSettings({...settings, accent:color})} className={`h-12 rounded-xl border capitalize ${settings.accent === color ? "border-white/40 bg-white/10 text-white" : "border-white/[0.06] text-white/35"}`}>{color}</button>)}</div></Field></div></Card><Card title="Поведение"><div className="space-y-3"><Toggle value={settings.compact} onChange={compact => setSettings({...settings, compact})} label="Компактный режим" note="Уменьшает отступы в таблицах и карточках"/><Toggle value={settings.animations} onChange={animations => setSettings({...settings, animations})} label="Анимации" note="Плавные переходы и интерактивные эффекты"/></div></Card></div>}

    {active === "AI" && <div className="grid gap-5 xl:grid-cols-[1fr_420px]"><Card title="LEGION Intelligence" description="Параметры AI-помощника"><div className="grid gap-4 sm:grid-cols-2"><Field label="Предпочитаемая модель"><select className={inputClass} value={settings.aiModel} onChange={e => setSettings({...settings, aiModel:e.target.value})}><option value="gemini-3.6-flash">Gemini 3.6 Flash</option><option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option></select></Field><Field label="Runtime модель"><div className="flex h-11 items-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-3 text-sm text-emerald-300">{runtimeModel}</div></Field><Field label={`Температура: ${settings.aiTemperature}`}><input type="range" min="0" max="1" step="0.05" value={settings.aiTemperature} onChange={e => setSettings({...settings, aiTemperature:Number(e.target.value)})} className="w-full accent-white"/></Field><Field label="Максимум токенов"><input type="number" className={inputClass} value={settings.aiMaxTokens} onChange={e => setSettings({...settings, aiMaxTokens:Number(e.target.value)})}/></Field></div><p className="mt-4 text-xs text-amber-200/55">Изменение предпочитаемой модели сохраняется в профиле. Фактическая серверная модель задаётся через GEMINI_MODEL в .env.local.</p></Card><Card title="Статус AI"><StatusBadge ok={status?.ai.ok ?? false} title={status?.ai.ok ? "AI ONLINE" : "AI OFFLINE"} text={status?.ai.message ?? "Проверка..."}/><button onClick={checkStatus} className="mt-4 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white/60 hover:text-white">Проверить подключение</button></Card></div>}

    {active === "Уведомления" && <div className="grid gap-5 xl:grid-cols-2"><Card title="Каналы уведомлений"><div className="space-y-3"><Toggle value={settings.browserNotifications} onChange={browserNotifications => setSettings({...settings, browserNotifications})} label="Браузер" note="Системные события внутри LegionHunt OS"/><Toggle value={settings.emailNotifications} onChange={emailNotifications => setSettings({...settings, emailNotifications})} label="Email" note="Важные уведомления на электронную почту"/><Toggle value={settings.telegramNotifications} onChange={telegramNotifications => setSettings({...settings, telegramNotifications})} label="Telegram" note="Заготовка для будущей интеграции"/></div></Card><Card title="Сводки"><Toggle value={settings.dailyDigest} onChange={dailyDigest => setSettings({...settings, dailyDigest})} label="Ежедневная сводка" note="CRM, Academy, Finance и Calendar одним отчётом"/></Card></div>}

    {active === "Система" && <div className="grid gap-5 lg:grid-cols-3"><Card title="PostgreSQL"><StatusBadge ok={status?.database.ok ?? false} title={status?.database.ok ? "DATABASE ONLINE" : "DATABASE OFFLINE"} text={status ? `${status.database.message} · ${status.database.latency} ms` : "Проверка..."}/></Card><Card title="Gemini API"><StatusBadge ok={status?.ai.ok ?? false} title={status?.ai.ok ? "AI ONLINE" : "AI OFFLINE"} text={status?.ai.message ?? "Проверка..."}/></Card><Card title="О системе"><dl className="space-y-3 text-sm"><Row label="LegionHunt OS" value={status?.app.version ?? "—"}/><Row label="Next.js" value={status?.app.next ?? "—"}/><Row label="Environment" value={status?.app.environment ?? "—"}/><Row label="Проверено" value={status ? new Date(status.app.checkedAt).toLocaleString("ru-RU") : "—"}/></dl><button onClick={checkStatus} className="mt-5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white/60 hover:text-white">Обновить статус</button></Card></div>}
  </div>
}

function StatusBadge({ ok, title, text }: { ok: boolean; title: string; text: string }) { return <div className={`rounded-2xl border p-4 ${ok ? "border-emerald-400/15 bg-emerald-400/[0.055]" : "border-rose-400/15 bg-rose-400/[0.055]"}`}><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${ok ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" : "bg-rose-400"}`}/><p className={`text-[10px] font-semibold ${ok ? "text-emerald-300" : "text-rose-300"}`}>{title}</p></div><p className="mt-3 break-words text-xs leading-5 text-white/35">{text}</p></div> }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><dt className="text-white/30">{label}</dt><dd className="text-right text-white/68">{value}</dd></div> }
