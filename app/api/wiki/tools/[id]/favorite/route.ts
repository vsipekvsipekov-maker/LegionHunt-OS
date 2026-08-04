import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const toolId = Number(id)
    const body = (await request.json()) as { user?: string; favorite?: boolean }
    const user = body.user?.trim() || "VSIPEK"
    const favorite = body.favorite ?? true

    if (favorite) {
      await db.query(
        `INSERT INTO legionhunt_wiki_tool_favorites(tool_id,user_name)
         VALUES($1,$2)
         ON CONFLICT(tool_id,user_name) DO NOTHING`,
        [toolId, user],
      )
    } else {
      await db.query(
        `DELETE FROM legionhunt_wiki_tool_favorites
         WHERE tool_id=$1 AND user_name=$2`,
        [toolId, user],
      )
    }

    return NextResponse.json({ favorite })
  } catch (error) {
    console.error("Tool favorite error:", error)
    return NextResponse.json(
      { error: "Не удалось обновить избранное." },
      { status: 500 },
    )
  }
}
