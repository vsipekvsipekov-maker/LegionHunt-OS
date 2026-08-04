import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()

    const user = request.nextUrl.searchParams.get("user")?.trim().slice(0, 160) || "VSIPEK"
    const sessionId = Number(request.nextUrl.searchParams.get("sessionId") ?? 0)

    if (sessionId && (!Number.isSafeInteger(sessionId) || sessionId <= 0)) {
      return NextResponse.json({ error: "Некорректная AI-сессия." }, { status: 400 })
    }

    if (sessionId) {
      const messages = await db.query(
        `SELECT m.id::text,m.role,m.content,m.sources,m.created_at::text
         FROM legionhunt_ai_messages m
         JOIN legionhunt_ai_sessions s ON s.id=m.session_id
         WHERE m.session_id=$1 AND s.user_name=$2
         ORDER BY m.created_at ASC,m.id ASC`,
        [sessionId, user],
      )

      if (!messages.rowCount) {
        const session = await db.query(
          `SELECT 1 FROM legionhunt_ai_sessions WHERE id=$1 AND user_name=$2`,
          [sessionId, user],
        )

        if (!session.rowCount) {
          return NextResponse.json({ error: "AI-сессия не найдена." }, { status: 404 })
        }
      }

      return NextResponse.json({
        messages: messages.rows.map((row) => ({
          id: Number(row.id),
          role: row.role,
          content: row.content,
          sources: row.sources ?? [],
          createdAt: row.created_at,
        })),
      })
    }

    const sessions = await db.query(
      `SELECT s.id::text,s.title,s.created_at::text,s.updated_at::text,
              COUNT(m.id)::text AS message_count
       FROM legionhunt_ai_sessions s
       LEFT JOIN legionhunt_ai_messages m ON m.session_id=s.id
       WHERE s.user_name=$1
       GROUP BY s.id
       ORDER BY s.updated_at DESC
       LIMIT 40`,
      [user],
    )

    return NextResponse.json({
      sessions: sessions.rows.map((row) => ({
        id: Number(row.id),
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messageCount: Number(row.message_count),
      })),
    })
  } catch (error) {
    console.error("AI Knowledge history error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить историю AI Knowledge." },
      { status: 500 },
    )
  }
}
