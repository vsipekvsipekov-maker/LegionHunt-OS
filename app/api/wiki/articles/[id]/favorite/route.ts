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
    const body = (await request.json()) as {
      user?: string
      favorite?: boolean
    }

    const user = body.user?.trim() || "VSIPEK"
    const favorite = body.favorite ?? true

    if (favorite) {
      await db.query(
        `
          INSERT INTO legionhunt_wiki_favorites (article_id, user_name)
          VALUES ($1, $2)
          ON CONFLICT (article_id, user_name) DO NOTHING
        `,
        [articleId, user],
      )
    } else {
      await db.query(
        `
          DELETE FROM legionhunt_wiki_favorites
          WHERE article_id = $1 AND user_name = $2
        `,
        [articleId, user],
      )
    }

    return NextResponse.json({ favorite })
  } catch (error) {
    console.error("Wiki favorite POST error:", error)
    return NextResponse.json(
      { error: "Не удалось обновить избранное." },
      { status: 500 },
    )
  }
}
