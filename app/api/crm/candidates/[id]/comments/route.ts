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
    const candidateId = Number(id)

    const result = await db.query<CommentRow>(
      `
        SELECT id::text, author, body, created_at::text
        FROM legionhunt_candidate_comments
        WHERE candidate_id = $1
        ORDER BY created_at ASC, id ASC
      `,
      [candidateId],
    )

    return NextResponse.json({
      comments: result.rows.map(serialize),
    })
  } catch (error) {
    console.error("Comments GET error:", error)
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
    const candidateId = Number(id)
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
        INSERT INTO legionhunt_candidate_comments
          (candidate_id, author, body)
        VALUES ($1, $2, $3)
        RETURNING id::text, author, body, created_at::text
      `,
      [candidateId, body.author?.trim() || "VSIPEK", text],
    )

    await db.query(
      `
        INSERT INTO legionhunt_candidate_activity
          (candidate_id, event_type, title, description, created_by)
        VALUES ($1, 'comment', 'Добавлен комментарий', $2, $3)
      `,
      [candidateId, text, body.author?.trim() || "VSIPEK"],
    )

    return NextResponse.json(
      { comment: serialize(result.rows[0]) },
      { status: 201 },
    )
  } catch (error) {
    console.error("Comments POST error:", error)
    return NextResponse.json(
      { error: "Не удалось добавить комментарий." },
      { status: 500 },
    )
  }
}
