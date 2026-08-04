import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export async function GET() {
  const startedAt = Date.now()

  try {
    await db.query("SELECT 1")

    return NextResponse.json({
      status: "ok",
      service: "LegionHunt OS",
      database: "connected",
      environment: process.env.NODE_ENV ?? "unknown",
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
    })
  } catch (error) {
    console.error("Health check error:", error)

    return NextResponse.json(
      {
        status: "error",
        service: "LegionHunt OS",
        database: "disconnected",
        environment: process.env.NODE_ENV ?? "unknown",
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
      },
      { status: 503 },
    )
  }
}