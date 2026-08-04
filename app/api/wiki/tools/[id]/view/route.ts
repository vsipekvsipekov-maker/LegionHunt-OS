import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as { viewer?: string }

    await db.query(
      `INSERT INTO legionhunt_wiki_tool_views(tool_id,viewer) VALUES($1,$2)`,
      [Number(id), body.viewer?.trim() || "VSIPEK"],
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Tool view error:", error)
    return NextResponse.json(
      { error: "Не удалось сохранить просмотр." },
      { status: 500 },
    )
  }
}
