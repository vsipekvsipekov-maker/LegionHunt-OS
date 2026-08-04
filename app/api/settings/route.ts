import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

const defaults = {
  displayName: "VSIPEK",
  username: "vsipek",
  email: "",
  role: "Leader",
  language: "ru",
  timezone: "Europe/Vilnius",
  theme: "dark",
  accent: "violet",
  compact: false,
  animations: true,
  browserNotifications: true,
  emailNotifications: false,
  telegramNotifications: false,
  dailyDigest: true,
  aiModel: "gemini-3.6-flash",
  aiTemperature: 0.45,
  aiMaxTokens: 1200,
}

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS legionhunt_settings (
      id BIGSERIAL PRIMARY KEY,
      user_key VARCHAR(120) NOT NULL UNIQUE,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

export async function GET() {
  try {
    await ensureTable()
    const result = await db.query(
      "SELECT payload, updated_at FROM legionhunt_settings WHERE user_key = $1 LIMIT 1",
      ["default"],
    )

    const saved = result.rows[0]?.payload ?? {}
    return NextResponse.json({
      settings: { ...defaults, ...saved },
      updatedAt: result.rows[0]?.updated_at ?? null,
      runtimeModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash",
    })
  } catch (error) {
    console.error("Settings GET error:", error)
    return NextResponse.json({ error: "Не удалось загрузить настройки." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureTable()
    const body = await request.json()
    const settings = { ...defaults, ...(body?.settings ?? {}) }

    await db.query(
      `INSERT INTO legionhunt_settings (user_key, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_key)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      ["default", JSON.stringify(settings)],
    )

    return NextResponse.json({ ok: true, settings })
  } catch (error) {
    console.error("Settings PUT error:", error)
    return NextResponse.json({ error: "Не удалось сохранить настройки." }, { status: 500 })
  }
}
