import { NextRequest, NextResponse } from "next/server"

import { db, ensureCrmSchema } from "@/lib/db"

type TaskRow = {
  id: string
  title: string
  completed: boolean
  due_at: string | null
  created_by: string
  created_at: string
}

function serialize(row: TaskRow) {
  return {
    id: Number(row.id),
    title: row.title,
    completed: row.completed,
    dueAt: row.due_at,
    createdBy: row.created_by,
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

    const result = await db.query<TaskRow>(
      `
        SELECT
          id::text,
          title,
          completed,
          due_at::text,
          created_by,
          created_at::text
        FROM legionhunt_candidate_tasks
        WHERE candidate_id = $1
        ORDER BY completed ASC, created_at DESC, id DESC
      `,
      [candidateId],
    )

    return NextResponse.json({
      tasks: result.rows.map(serialize),
    })
  } catch (error) {
    console.error("Tasks GET error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить задачи." },
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
      title?: string
      dueAt?: string | null
      createdBy?: string
    }

    const title = body.title?.trim()
    if (!title) {
      return NextResponse.json(
        { error: "Название задачи не должно быть пустым." },
        { status: 400 },
      )
    }

    const result = await db.query<TaskRow>(
      `
        INSERT INTO legionhunt_candidate_tasks
          (candidate_id, title, due_at, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING
          id::text,
          title,
          completed,
          due_at::text,
          created_by,
          created_at::text
      `,
      [
        candidateId,
        title,
        body.dueAt || null,
        body.createdBy?.trim() || "VSIPEK",
      ],
    )

    await db.query(
      `
        INSERT INTO legionhunt_candidate_activity
          (candidate_id, event_type, title, description, created_by)
        VALUES ($1, 'task', 'Создана задача', $2, $3)
      `,
      [candidateId, title, body.createdBy?.trim() || "VSIPEK"],
    )

    return NextResponse.json(
      { task: serialize(result.rows[0]) },
      { status: 201 },
    )
  } catch (error) {
    console.error("Tasks POST error:", error)
    return NextResponse.json(
      { error: "Не удалось создать задачу." },
      { status: 500 },
    )
  }
}
