import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const startedAt = Date.now()
  let database = { ok: false, latency: 0, message: "Нет соединения" }
  let ai = { ok: false, model: process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash", message: "Ключ не настроен" }

  try {
    const dbStart = Date.now()
    await db.query("SELECT 1")
    database = { ok: true, latency: Date.now() - dbStart, message: "PostgreSQL подключён" }
  } catch (error) {
    database.message = error instanceof Error ? error.message : "Ошибка PostgreSQL"
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ai.model)}`,
        { headers: { "x-goog-api-key": apiKey }, cache: "no-store", signal: AbortSignal.timeout(10000) },
      )
      const raw = await response.text()
      ai = {
        ok: response.ok,
        model: ai.model,
        message: response.ok ? "Gemini API доступен" : `Gemini HTTP ${response.status}: ${raw.slice(0, 120)}`,
      }
    } catch (error) {
      ai.message = error instanceof Error ? error.message : "Ошибка Gemini API"
    }
  }

  return NextResponse.json({
    database,
    ai,
    app: {
      version: "1.0.0-rc1",
      next: "16.2.12",
      environment: process.env.NODE_ENV ?? "development",
      checkedAt: new Date().toISOString(),
      latency: Date.now() - startedAt,
    },
  })
}
