import { NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params

    const result = await db.query(
      `
        SELECT id::text, version, change_note, author, created_at::text
        FROM legionhunt_wiki_tool_versions
        WHERE tool_id=$1
        ORDER BY created_at DESC
        LIMIT 30
      `,
      [Number(id)],
    )

    return NextResponse.json({
      versions: result.rows.map((row) => ({
        id: Number(row.id),
        version: row.version,
        changeNote: row.change_note,
        author: row.author,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    console.error("Tool versions error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить версии." },
      { status: 500 },
    )
  }
}
