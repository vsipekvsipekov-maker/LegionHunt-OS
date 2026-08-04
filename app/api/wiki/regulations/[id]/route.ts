import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const regulationId = Number(id)
    const body = (await request.json()) as {
      title?: string
      category?: string
      status?: "draft" | "active" | "archived"
      owner?: string
      summary?: string
      content?: string
      steps?: Array<{ title: string; description: string }>
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
    if (body.owner !== undefined) add("owner", body.owner.trim())
    if (body.summary !== undefined) add("summary", body.summary)
    if (body.content !== undefined) add("content", body.content)
    if (body.tags !== undefined) add("tags", body.tags)

    if (body.steps !== undefined) {
      values.push(JSON.stringify(body.steps))
      updates.push(`steps = $${values.length}::jsonb`)
    }

    if (!updates.length) {
      return NextResponse.json({ error: "Нет изменений." }, { status: 400 })
    }

    updates.push("version_number = version_number + 1")
    updates.push("updated_at = NOW()")
    values.push(regulationId)

    const result = await db.query(
      `
        UPDATE legionhunt_wiki_regulations
        SET ${updates.join(", ")}
        WHERE id = $${values.length}
        RETURNING *
      `,
      values,
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Регламент не найден." },
        { status: 404 },
      )
    }

    return NextResponse.json({ regulation: result.rows[0] })
  } catch (error) {
    console.error("Regulation PATCH error:", error)
    return NextResponse.json(
      { error: "Не удалось обновить регламент." },
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
    await db.query(
      "DELETE FROM legionhunt_wiki_regulations WHERE id = $1",
      [Number(id)],
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Regulation DELETE error:", error)
    return NextResponse.json(
      { error: "Не удалось удалить регламент." },
      { status: 500 },
    )
  }
}
