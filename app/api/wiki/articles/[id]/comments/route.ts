import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type CommentRow = {
  id: string
  author: string
  body: string
  created_at: string
}

function serialize(row: CommentRow) {
  return {
    id: Number(row.id),
    author: row.author,
    body: row.body,
    createdAt: row.created_at,
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const articleId = Number(id)

    const result = await db.query<CommentRow>(
      `
        SELECT id::text, author, body, created_at::text
        FROM legionhunt_wiki_comments
        WHERE article_id = $1
        ORDER BY created_at ASC, id ASC
      `,
      [articleId],
    )

    return NextResponse.json({
      comments: result.rows.map(serialize),
    })
  } catch (error) {
    console.error("Wiki comments GET error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить комментарии." },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const articleId = Number(id)
    const body = (await request.json()) as {
      body?: string
      author?: string
    }

    const text = body.body?.trim()
    if (!text) {
      return NextResponse.json(
        { error: "Комментарий не должен быть пустым." },
        { status: 400 },
      )
    }

    const result = await db.query<CommentRow>(
      `
        INSERT INTO legionhunt_wiki_comments
          (article_id, author, body)
        VALUES ($1, $2, $3)
        RETURNING id::text, author, body, created_at::text
      `,
      [articleId, body.author?.trim() || "VSIPEK", text],
    )

    return NextResponse.json(
      { comment: serialize(result.rows[0]) },
      { status: 201 },
    )
  } catch (error) {
    console.error("Wiki comments POST error:", error)
    return NextResponse.json(
      { error: "Не удалось добавить комментарий." },
      { status: 500 },
    )
  }
}
