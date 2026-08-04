import { NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

async function seedActivity() {
  const count = await db.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM legionhunt_activity",
  )

  if (Number(count.rows[0]?.count ?? 0) > 0) return

  await db.query(`
    INSERT INTO legionhunt_activity
      (actor, action, entity_type, entity_title, metadata, created_at)
    VALUES
      ('VSIPEK', 'обновил', 'article', 'Работа с возражениями', '{"icon":"📄"}', NOW() - INTERVAL '8 minutes'),
      ('MENTOR', 'создал', 'regulation', 'Регламент обучения новичка', '{"icon":"📋"}', NOW() - INTERVAL '22 minutes'),
      ('LEGION AI', 'импортировал', 'article', 'Материалы из PDF', '{"icon":"🤖"}', NOW() - INTERVAL '47 minutes'),
      ('VSIPEK', 'добавил', 'tool', 'Wiki Import', '{"icon":"🛠️"}', NOW() - INTERVAL '2 hours'),
      ('VSIPEK', 'создал', 'case', 'Возврат кандидата после тишины', '{"icon":"💼"}', NOW() - INTERVAL '3 hours')
  `)
}

export async function GET() {
  try {
    await ensureCrmSchema()
    await seedActivity()

    const result = await db.query<{
      id: string
      actor: string
      action: string
      entity_type: string
      entity_id: string | null
      entity_title: string
      metadata: Record<string, unknown>
      created_at: string
    }>(`
      SELECT
        id::text,
        actor,
        action,
        entity_type,
        entity_id::text,
        entity_title,
        metadata,
        created_at::text
      FROM legionhunt_activity
      ORDER BY created_at DESC
      LIMIT 30
    `)

    return NextResponse.json({
      activity: result.rows.map((row) => ({
        id: Number(row.id),
        actor: row.actor,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id ? Number(row.entity_id) : null,
        entityTitle: row.entity_title,
        metadata: row.metadata ?? {},
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    console.error("Dashboard activity error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить активность." },
      { status: 500 },
    )
  }
}
