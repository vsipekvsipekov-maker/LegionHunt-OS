import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type CaseRow = {
  id: string
  title: string
  category: string
  status: "success" | "in_progress" | "failed" | "archived"
  situation: string
  problem: string
  solution: string
  result: string
  lessons: string
  owner: string
  tags: string[]
  created_at: string
  updated_at: string
}

function serialize(row: CaseRow) {
  return {
    id: Number(row.id),
    title: row.title,
    category: row.category,
    status: row.status,
    situation: row.situation,
    problem: row.problem,
    solution: row.solution,
    result: row.result,
    lessons: row.lessons,
    owner: row.owner,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const caseId = Number(id)

    const body = (await request.json()) as {
      title?: string
      category?: string
      status?: "success" | "in_progress" | "failed" | "archived"
      situation?: string
      problem?: string
      solution?: string
      result?: string
      lessons?: string
      owner?: string
      tags?: string[]
    }

    const updates: string[] = []
    const values: Array<string | string[] | number> = []

    function add(column: string, value: string | string[] | number) {
      values.push(value)
      updates.push(`${column} = $${values.length}`)
    }

    if (body.title !== undefined) add("title", body.title.trim())
    if (body.category !== undefined) add("category", body.category.trim())
    if (body.status !== undefined) add("status", body.status)
    if (body.situation !== undefined) add("situation", body.situation)
    if (body.problem !== undefined) add("problem", body.problem)
    if (body.solution !== undefined) add("solution", body.solution)
    if (body.result !== undefined) add("result", body.result)
    if (body.lessons !== undefined) add("lessons", body.lessons)
    if (body.owner !== undefined) add("owner", body.owner.trim())
    if (body.tags !== undefined) add("tags", body.tags)

    if (!updates.length) {
      return NextResponse.json({ error: "Нет изменений." }, { status: 400 })
    }

    updates.push("updated_at = NOW()")
    values.push(caseId)

    const result = await db.query<CaseRow>(
      `
        UPDATE legionhunt_wiki_cases
        SET ${updates.join(", ")}
        WHERE id = $${values.length}
        RETURNING
          id::text,
          title,
          category,
          status,
          situation,
          problem,
          solution,
          result,
          lessons,
          owner,
          tags,
          created_at::text,
          updated_at::text
      `,
      values,
    )

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Кейс не найден." }, { status: 404 })
    }

    return NextResponse.json({ case: serialize(result.rows[0]) })
  } catch (error) {
    console.error("Case PATCH error:", error)
    return NextResponse.json(
      { error: "Не удалось обновить кейс." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    await db.query("DELETE FROM legionhunt_wiki_cases WHERE id = $1", [
      Number(id),
    ])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Case DELETE error:", error)
    return NextResponse.json(
      { error: "Не удалось удалить кейс." },
      { status: 500 },
    )
  }
}
