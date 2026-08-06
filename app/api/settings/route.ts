import { NextRequest, NextResponse } from "next/server"

import { db } from "@/lib/db"
import { createClient } from "@/lib/supabase-server"

const preferenceDefaults = {
  username: "",
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

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  mentor: "Mentor",
  recruiter: "Recruiter",
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

async function getAuthenticatedUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, first_name, last_name, role, email")
    .eq("id", user.id)
    .maybeSingle()

  const metadataFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : ""

  const metadataName = [
    typeof user.user_metadata?.first_name === "string"
      ? user.user_metadata.first_name.trim()
      : "",
    typeof user.user_metadata?.last_name === "string"
      ? user.user_metadata.last_name.trim()
      : "",
  ]
    .filter(Boolean)
    .join(" ")

  const fullName =
    profile?.full_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    metadataFullName ||
    metadataName ||
    user.email?.split("@")[0] ||
    "Пользователь"

  const email = profile?.email?.trim() || user.email || ""
  const role = roleLabels[profile?.role ?? ""] ?? "Recruiter"

  return {
    supabase,
    user,
    fullName,
    email,
    role,
  }
}

export async function GET() {
  try {
    await ensureTable()

    const current = await getAuthenticatedUser()

    if (!current) {
      return NextResponse.json(
        { error: "Необходима авторизация." },
        { status: 401 },
      )
    }

    const result = await db.query<{
      payload: Record<string, unknown>
      updated_at: string
    }>(
      `
        SELECT payload, updated_at
        FROM legionhunt_settings
        WHERE user_key = $1
        LIMIT 1
      `,
      [current.user.id],
    )

    const saved = result.rows[0]?.payload ?? {}

    return NextResponse.json({
      settings: {
        ...preferenceDefaults,
        ...saved,
        displayName: current.fullName,
        email: current.email,
        role: current.role,
        theme: "dark",
      },
      updatedAt: result.rows[0]?.updated_at ?? null,
      runtimeModel:
        process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash",
    })
  } catch (error) {
    console.error("Settings GET error:", error)

    return NextResponse.json(
      { error: "Не удалось загрузить настройки." },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureTable()

    const current = await getAuthenticatedUser()

    if (!current) {
      return NextResponse.json(
        { error: "Необходима авторизация." },
        { status: 401 },
      )
    }

    const body = (await request.json()) as {
      settings?: Record<string, unknown>
    }

    const incoming = body.settings ?? {}
    const displayName =
      typeof incoming.displayName === "string"
        ? incoming.displayName.trim()
        : current.fullName

    const preferences = {
      ...preferenceDefaults,
      username:
        typeof incoming.username === "string"
          ? incoming.username.trim()
          : "",
      language: incoming.language === "en" ? "en" : "ru",
      timezone:
        typeof incoming.timezone === "string"
          ? incoming.timezone
          : preferenceDefaults.timezone,
      theme: "dark",
      accent:
        incoming.accent === "blue" ||
        incoming.accent === "emerald" ||
        incoming.accent === "rose"
          ? incoming.accent
          : "violet",
      compact: incoming.compact === true,
      animations: incoming.animations !== false,
      browserNotifications:
        incoming.browserNotifications !== false,
      emailNotifications: incoming.emailNotifications === true,
      telegramNotifications:
        incoming.telegramNotifications === true,
      dailyDigest: incoming.dailyDigest !== false,
      aiModel:
        typeof incoming.aiModel === "string"
          ? incoming.aiModel
          : preferenceDefaults.aiModel,
      aiTemperature:
        typeof incoming.aiTemperature === "number"
          ? Math.min(1, Math.max(0, incoming.aiTemperature))
          : preferenceDefaults.aiTemperature,
      aiMaxTokens:
        typeof incoming.aiMaxTokens === "number"
          ? Math.min(8000, Math.max(100, incoming.aiMaxTokens))
          : preferenceDefaults.aiMaxTokens,
    }

    const { error: profileError } = await current.supabase
      .from("profiles")
      .update({
        full_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.user.id)

    if (profileError) {
      console.error("Settings profile update error:", profileError)
    }

    await db.query(
      `
        INSERT INTO legionhunt_settings (
          user_key,
          payload,
          updated_at
        )
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (user_key)
        DO UPDATE SET
          payload = EXCLUDED.payload,
          updated_at = NOW()
      `,
      [current.user.id, JSON.stringify(preferences)],
    )

    return NextResponse.json({
      ok: true,
      settings: {
        ...preferences,
        displayName,
        email: current.email,
        role: current.role,
      },
    })
  } catch (error) {
    console.error("Settings PUT error:", error)

    return NextResponse.json(
      { error: "Не удалось сохранить настройки." },
      { status: 500 },
    )
  }
}
