"use client"

import { useState } from "react"

type FinanceData = {
  metrics?: {
    income?: number
    expenses?: number
    profit?: number
    roi?: number
    pendingIncome?: number
    transactionCount?: number
  }
  categoryBreakdown?: Array<{
    category: string
    type: "income" | "expense"
    amount: number
  }>
}

type AiResponse = {
  answer?: string
  error?: string
}

export function AiForecast() {
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState("")
  const [error, setError] = useState("")

  async function generateForecast() {
    setLoading(true)
    setAnswer("")
    setError("")

    try {
      const financeResponse = await fetch(
        "/api/finance?days=30&type=all&q=",
        {
          cache: "no-store",
        },
      )

      const financeData =
        (await financeResponse.json()) as FinanceData & {
          error?: string
        }

      if (!financeResponse.ok) {
        throw new Error(
          financeData.error ||
            "Не удалось загрузить финансовые данные.",
        )
      }

      const metrics = financeData.metrics ?? {}
      const breakdown = financeData.categoryBreakdown ?? []

      const categories = breakdown
        .slice(0, 10)
        .map(
          (item) =>
            `${item.type === "income" ? "Доход" : "Расход"} — ${
              item.category
            }: $${Number(item.amount || 0).toFixed(2)}`,
        )
        .join("\n")

      const aiResponse = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: [
            "Ты финансовый аналитик LegionHunt.",
            "Проанализируй финансовые данные за последние 30 дней.",
            "",
            `Доход: $${Number(metrics.income || 0).toFixed(2)}`,
            `Расходы: $${Number(metrics.expenses || 0).toFixed(2)}`,
            `Прибыль: $${Number(metrics.profit || 0).toFixed(2)}`,
            `ROI: ${Number(metrics.roi || 0)}%`,
            `Ожидаемые доходы: $${Number(
              metrics.pendingIncome || 0,
            ).toFixed(2)}`,
            `Количество операций: ${Number(
              metrics.transactionCount || 0,
            )}`,
            "",
            "Категории:",
            categories || "Нет данных по категориям.",
            "",
            "Ответь кратко на русском языке.",
            "Дай:",
            "1. Оценку финансового состояния.",
            "2. Основные риски.",
            "3. Прогноз на следующие 30 дней.",
            "4. Три конкретных рекомендации.",
            "Не придумывай точные цифры прогноза, если данных недостаточно.",
          ].join("\n"),
          history: [],
        }),
      })

      const aiData = (await aiResponse.json()) as AiResponse

      if (!aiResponse.ok || !aiData.answer) {
        throw new Error(
          aiData.error || "AI не смог подготовить прогноз.",
        )
      }

      setAnswer(aiData.answer)
    } catch (forecastError) {
      setError(
        forecastError instanceof Error
          ? forecastError.message
          : "Не удалось подготовить прогноз.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.025] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/60">
            LEGION Intelligence
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            AI Finance Forecast
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">
            Анализирует доходы, расходы, прибыль, ROI и категории
            операций за последние 30 дней.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void generateForecast()}
          disabled={loading}
          className="h-11 shrink-0 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Анализирую…" : "Создать прогноз"}
        </button>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 min-h-40 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
        {answer ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-white/70">
            {answer}
          </p>
        ) : (
          <p className="text-sm leading-6 text-white/28">
            Нажми «Создать прогноз», чтобы получить анализ,
            риски и рекомендации на следующий месяц.
          </p>
        )}
      </div>

      {answer ? (
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(answer)}
          className="mt-4 rounded-xl border border-white/[0.09] px-4 py-2.5 text-xs text-white/60 transition hover:bg-white/[0.05] hover:text-white"
        >
          Копировать прогноз
        </button>
      ) : null}
    </section>
  )
}