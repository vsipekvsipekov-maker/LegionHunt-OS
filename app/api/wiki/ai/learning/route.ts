import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const status = request.nextUrl.searchParams.get("status") || "pending"
    const result = await db.query(
      `SELECT id::text,question,status,occurrences,first_user,last_user,answer,
              article_id::text,created_at::text,updated_at::text,resolved_at::text
       FROM legionhunt_ai_learning_queue
       WHERE ($1='all' OR status=$1)
       ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END,
                occurrences DESC,updated_at DESC
       LIMIT 100`,
      [status],
    )
    const stats = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status='pending')::text AS pending,
              COUNT(*) FILTER (WHERE status='learned')::text AS learned,
              COALESCE(SUM(occurrences),0)::text AS total
       FROM legionhunt_ai_learning_queue`,
    )
    return NextResponse.json({
      items: result.rows.map((row) => ({
        id: Number(row.id), question: row.question, status: row.status,
        occurrences: Number(row.occurrences), firstUser: row.first_user,
        lastUser: row.last_user, answer: row.answer,
        articleId: row.article_id ? Number(row.article_id) : null,
        createdAt: row.created_at, updatedAt: row.updated_at, resolvedAt: row.resolved_at,
      })),
      stats: {
        pending: Number(stats.rows[0]?.pending ?? 0),
        learned: Number(stats.rows[0]?.learned ?? 0),
        total: Number(stats.rows[0]?.total ?? 0),
      },
    })
  } catch (error) {
    console.error("AI learning list error:", error)
    return NextResponse.json({ error: "Не удалось загрузить очередь обучения." }, { status: 500 })
  }
}
