import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const toolId = Number(id)

    const previous = await db.query(
      "SELECT * FROM legionhunt_wiki_tools WHERE id = $1",
      [toolId],
    )
    if (!previous.rows[0]) {
      return NextResponse.json({ error: "Инструмент не найден." }, { status: 404 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const allowed = new Map([
      ["name", "name"],
      ["icon", "icon"],
      ["category", "category"],
      ["status", "status"],
      ["description", "description"],
      ["instructions", "instructions"],
      ["launchUrl", "launch_url"],
      ["owner", "owner"],
      ["version", "version"],
      ["tags", "tags"],
      ["requirements", "requirements"],
      ["relatedArticleIds", "related_article_ids"],
      ["relatedCaseIds", "related_case_ids"],
      ["relatedRegulationIds", "related_regulation_ids"],
    ])

    const updates: string[] = []
    const values: unknown[] = []

    for (const [key, column] of allowed) {
      if (body[key] !== undefined) {
        values.push(body[key])
        updates.push(`${column} = $${values.length}`)
      }
    }

    if (!updates.length) {
      return NextResponse.json({ error: "Нет изменений." }, { status: 400 })
    }

    await db.query(
      `
        INSERT INTO legionhunt_wiki_tool_versions
          (tool_id, version, change_note, snapshot, author)
        VALUES ($1,$2,$3,$4::jsonb,$5)
      `,
      [
        toolId,
        String(previous.rows[0].version),
        String(body.changeNote ?? "Обновление инструмента"),
        JSON.stringify(previous.rows[0]),
        String(body.author ?? "VSIPEK"),
      ],
    )

    updates.push("updated_at = NOW()")
    values.push(toolId)

    await db.query(
      `UPDATE legionhunt_wiki_tools SET ${updates.join(", ")} WHERE id = $${values.length}`,
      values,
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Tool PATCH error:", error)
    return NextResponse.json(
      { error: "Не удалось обновить инструмент." },
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
    await db.query("DELETE FROM legionhunt_wiki_tools WHERE id = $1", [Number(id)])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Tool DELETE error:", error)
    return NextResponse.json(
      { error: "Не удалось удалить инструмент." },
      { status: 500 },
    )
  }
}
