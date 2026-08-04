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
      user?: string
    }

    const user = body.user?.trim() || "VSIPEK"

    await db.query(
      `
        INSERT INTO legionhunt_wiki_recent (article_id, user_name, opened_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (article_id, user_name)
        DO UPDATE SET opened_at = NOW()
      `,
      [articleId, user],
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Wiki recent POST error:", error)
    return NextResponse.json(
      { error: "Не удалось сохранить недавнюю статью." },
      { status: 500 },
    )
  }
}
