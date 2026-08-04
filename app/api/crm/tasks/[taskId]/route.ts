import { NextRequest, NextResponse } from "next/server"

import { db, ensureCrmSchema } from "@/lib/db"

type TaskRow = {
  id: string
  candidate_id: string
  title: string
  completed: boolean
  due_at: string | null
  created_by: string
  created_at: string
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    await ensureCrmSchema()
    const { taskId } = await context.params
    const id = Number(taskId)
    const body = (await request.json()) as { completed?: boolean }

    if (typeof body.completed !== "boolean") {
      return NextResponse.json(
        { error: "Поле completed обязательно." },
        { status: 400 },
      )
    }

    const result = await db.query<TaskRow>(
      `
        UPDATE legionhunt_candidate_tasks
        SET completed = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING
          id::text,
          candidate_id::text,
          title,
          completed,
          due_at::text,
          created_by,
          created_at::text
      `,
      [body.completed, id],
    )

    const task = result.rows[0]
    if (!task) {
      return NextResponse.json({ error: "Задача не найдена." }, { status: 404 })
    }

    await db.query(
      `
        INSERT INTO legionhunt_candidate_activity
          (candidate_id, event_type, title, description, created_by)
        VALUES ($1, 'task', $2, $3, $4)
      `,
      [
        Number(task.candidate_id),
        body.completed ? "Задача выполнена" : "Задача возвращена",
        task.title,
        task.created_by,
      ],
    )

    return NextResponse.json({
      task: {
        id: Number(task.id),
        title: task.title,
        completed: task.completed,
        dueAt: task.due_at,
        createdBy: task.created_by,
        createdAt: task.created_at,
      },
    })
  } catch (error) {
    console.error("Task PATCH error:", error)
    return NextResponse.json(
      { error: "Не удалось обновить задачу." },
      { status: 500 },
    )
  }
}
