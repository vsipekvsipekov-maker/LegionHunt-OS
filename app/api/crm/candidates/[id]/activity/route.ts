import { NextResponse } from "next/server"

import { db, ensureCrmSchema } from "@/lib/db"

type ActivityRow = {
  id: string
  event_type: string
  title: string
  description: string
  created_by: string
  created_at: string
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const candidateId = Number(id)

    if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
      return NextResponse.json({ error: "Некорректный ID." }, { status: 400 })
    }

    const result = await db.query<ActivityRow>(
      `
        SELECT
          id::text,
          event_type,
          title,
          description,
          created_by,
          created_at::text
        FROM legionhunt_candidate_activity
        WHERE candidate_id = $1
        ORDER BY created_at DESC, id DESC
      `,
      [candidateId],
    )

    return NextResponse.json({
      activity: result.rows.map((row) => ({
        id: Number(row.id),
        eventType: row.event_type,
        title: row.title,
        description: row.description,
        createdBy: row.created_by,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    console.error("Activity GET error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить Timeline." },
      { status: 500 },
    )
  }
}
