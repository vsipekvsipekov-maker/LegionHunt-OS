import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const articleId = Number(id)
    const body = (await request.json().catch(() => ({}))) as {
      viewer?: string
    }

    await db.query(
      `
        INSERT INTO legionhunt_wiki_views (article_id, viewer)
        VALUES ($1, $2)
      `,
      [articleId, body.viewer?.trim() || "VSIPEK"],
    )

    const count = await db.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM legionhunt_wiki_views
        WHERE article_id = $1
      `,
      [articleId],
    )

    return NextResponse.json({
      views: Number(count.rows[0]?.count ?? 0),
    })
  } catch (error) {
    console.error("Wiki view POST error:", error)
    return NextResponse.json(
      { error: "Не удалось записать просмотр." },
      { status: 500 },
    )
  }
}
