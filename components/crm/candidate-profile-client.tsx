"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { BrainIcon } from "@/components/icons"

type Candidate = {
  id: number
  name: string
  username: string
  country: string
  source: string
  mentor: string
  status: string
  priority: string
  score: number
  lastActivity: string
  nextAction: string
  note: string
  nextContactAt: string | null
}

type Props = {
  candidate: Candidate
  displayName: string
}

const statusOptions = [
  ["new", "Новые"],
  ["contact", "В работе"],
  ["call", "Созвон"],
  ["training", "Обучение"],
  ["active", "Активные"],
] as const

const priorityOptions = [
  ["high", "Высокий"],
  ["medium", "Средний"],
  ["low", "Низкий"],
] as const

function toLocalDateTime(value: string | null) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function CandidateProfileClient({ candidate, displayName }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: candidate.name,
    username: candidate.username,
    country: candidate.country,
    source: candidate.source,
    mentor: candidate.mentor,
    status: candidate.status,
    priority: candidate.priority,
    score: String(candidate.score),
    nextAction: candidate.nextAction,
    note: candidate.note,
    nextContactAt: toLocalDateTime(candidate.nextContactAt),
  })
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnswer, setAiAnswer] = useState("")
  const [error, setError] = useState("")

  const changed = useMemo(() => {
    return (
      form.name !== candidate.name ||
      form.username !== candidate.username ||
      form.country !== candidate.country ||
      form.source !== candidate.source ||
      form.mentor !== candidate.mentor ||
      form.status !== candidate.status ||
      form.priority !== candidate.priority ||
      Number(form.score) !== candidate.score ||
      form.nextAction !== candidate.nextAction ||
      form.note !== candidate.note ||
      form.nextContactAt !== toLocalDateTime(candidate.nextContactAt)
    )
  }, [candidate, form])

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setSaveMessage("")
    setError("")
  }

  async function save() {
    const name = form.name.trim()

    if (name.length < 2) {
      setError("Имя должно содержать минимум 2 символа.")
      return
    }

    setSaving(true)
    setError("")
    setSaveMessage("")

    try {
      const response = await fetch(`/api/crm/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username: form.username.trim(),
          country: form.country.trim(),
          source: form.source.trim(),
          mentor: form.mentor.trim(),
          status: form.status,
          priority: form.priority,
          score: Number(form.score),
          nextAction: form.nextAction.trim(),
          note: form.note.trim(),
          nextContactAt: form.nextContactAt
            ? new Date(form.nextContactAt).toISOString()
            : null,
          updatedBy: displayName,
        }),
      })

      const payload = (await response.json()) as {
        candidate?: Candidate
        error?: string
      }

      if (!response.ok || !payload.candidate) {
        throw new Error(payload.error || "Не удалось сохранить кандидата.")
      }

      setSaveMessage("Изменения сохранены")
      router.refresh()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Не удалось сохранить кандидата.",
      )
    } finally {
      setSaving(false)
    }
  }

  async function generateAiRecommendation() {function saveAiToNote() {
  if (!aiAnswer) return

  setForm((current) => ({
    ...current,
    note:
      current.note.trim().length > 0
        ? `${current.note}\n\n──────── AI ────────\n${aiAnswer}`
        : aiAnswer,
  }))

  setSaveMessage("AI-рекомендация добавлена в заметку. Нажмите «Сохранить изменения».")
}
    setAiLoading(true)
    setAiAnswer("")
    setError("")

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: [
            "Проанализируй кандидата LegionHunt и дай краткую рекомендацию.",
            `Имя: ${form.name}`,
            `Telegram: ${form.username || "не указан"}`,
            `Страна: ${form.country || "не указана"}`,
            `Источник: ${form.source || "не указан"}`,
            `Наставник: ${form.mentor || "не назначен"}`,
            `Этап: ${form.status}`,
            `Приоритет: ${form.priority}`,
            `AI score: ${form.score}%`,
            `Следующее действие: ${form.nextAction || "не назначено"}`,
            `Заметка: ${form.note || "нет"}`,
            "Ответь на русском. Дай: 1) оценку ситуации; 2) следующее действие; 3) готовое короткое сообщение кандидату.",
          ].join("\n"),
          history: [],
        }),
      })

      const payload = (await response.json()) as {
        answer?: string
        error?: string
      }

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || "AI не смог подготовить рекомендацию.")
      }

      setAiAnswer(payload.answer)
    } catch (aiError) {
      setError(
        aiError instanceof Error
          ? aiError.message
          : "AI не смог подготовить рекомендацию.",
      )
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
              Редактирование кандидата
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
              Данные и этап воронки
            </h2>
          </div>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !changed}
            className="h-11 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {saving ? "Сохраняю…" : changed ? "Сохранить изменения" : "Сохранено"}
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {saveMessage ? (
          <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm text-emerald-200">
            {saveMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Имя">
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} className="lh-input" />
          </Field>
          <Field label="Telegram">
            <input value={form.username} onChange={(event) => updateField("username", event.target.value)} className="lh-input" placeholder="@username" />
          </Field>
          <Field label="Страна">
            <input value={form.country} onChange={(event) => updateField("country", event.target.value)} className="lh-input" />
          </Field>
          <Field label="Источник">
            <input value={form.source} onChange={(event) => updateField("source", event.target.value)} className="lh-input" />
          </Field>
          <Field label="Наставник">
            <input value={form.mentor} onChange={(event) => updateField("mentor", event.target.value)} className="lh-input" />
          </Field>
          <Field label="Следующий контакт">
            <input type="datetime-local" value={form.nextContactAt} onChange={(event) => updateField("nextContactAt", event.target.value)} className="lh-input" />
          </Field>
          <Field label="Этап">
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="lh-input">
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Приоритет">
            <select value={form.priority} onChange={(event) => updateField("priority", event.target.value)} className="lh-input">
              {priorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="AI Score">
            <input type="number" min="0" max="100" value={form.score} onChange={(event) => updateField("score", event.target.value)} className="lh-input" />
          </Field>
        </div>

        <div className="mt-4 space-y-4">
          <Field label="Следующее действие">
            <input value={form.nextAction} onChange={(event) => updateField("nextAction", event.target.value)} className="lh-input" />
          </Field>
          <Field label="Заметка">
            <textarea rows={6} value={form.note} onChange={(event) => updateField("note", event.target.value)} className="lh-input min-h-36 resize-y py-3" />
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.025] p-6">
        <div className="flex items-center gap-2 text-violet-200"> 
          <BrainIcon className="size-5" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">LEGION Intelligence</p>
        </div>

        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">AI-анализ кандидата</h2>
        <p className="mt-3 text-sm leading-6 text-white/45">AI использует текущие данные карточки и готовит следующее действие и сообщение.</p>

        <button
          type="button"
          onClick={() => void generateAiRecommendation()}
          disabled={aiLoading}
          className="mt-6 h-11 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
        >
          {aiLoading ? "Анализирую…" : "Подготовить рекомендацию"}
        </button>

        <div className="mt-5 min-h-64 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
          {aiAnswer ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-white/70">{aiAnswer}</p>
          ) : (
            <p className="text-sm leading-6 text-white/28">Здесь появится оценка ситуации, рекомендуемый следующий шаг и готовый текст для Telegram.</p>
          )}
        </div>
      </section>

      <style jsx>{`
        :global(.lh-input) {
          width: 100%;
          min-height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          padding: 0 12px;
          color: white;
          outline: none;
        }
        :global(.lh-input:focus) {
          border-color: rgba(196,181,253,.35);
        }
      `}</style>
    </div > 
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">{label}</span>
      {children}
    </label>
  )
}
