"use client"

import { useCallback, useEffect, useState } from "react"
import { BrainIcon } from "@/components/icons"

type AiData = {
  answer: string
}

export function AiDashboard() {
  const [loading, setLoading] = useState(true)
  const [answer, setAnswer] = useState("")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `
Ты аналитик LegionHunt.

На основе текущих данных CRM напиши короткую ежедневную сводку.

Ответ должен содержать:

📈 Общую ситуацию.

🔥 Главный приоритет.

⚠️ Возможные риски.

🎯 Что сделать сегодня.
`,
          history: [],
        }),
      })

      const data: AiData = await res.json()

      setAnswer(data.answer ?? "Нет данных.")
    } catch {
      setAnswer("AI сейчас недоступен.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-6">
      <div className="mb-4 flex items-center gap-2">
        <BrainIcon className="size-5 text-violet-300" />
        <h3 className="font-semibold text-white">
          LEGION Intelligence
        </h3>
      </div>

      {loading ? (
        <p className="text-white/50">
          Анализирую CRM...
        </p>
      ) : (
        <div className="whitespace-pre-wrap text-sm leading-7 text-white/75">
          {answer}
        </div>
      )}
    </div>
  )
}