import { NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET() {
  try {
    await ensureCrmSchema()

    const result = await db.query<{
      id: string
      title: string
      kind: string
      category: string
      updated_at: string
    }>(`
      SELECT * FROM (
        SELECT
          id::text,
          title,
          'article'::text AS kind,
          category,
          updated_at::text
        FROM legionhunt_wiki_articles

        UNION ALL

        SELECT
          id::text,
          title,
          'case'::text AS kind,
          category,
          updated_at::text
        FROM legionhunt_wiki_cases

        UNION ALL

        SELECT
          id::text,
          title,
          'regulation'::text AS kind,
          category,
          updated_at::text
        FROM legionhunt_wiki_regulations

        UNION ALL

        SELECT
          id::text,
          name AS title,
          'tool'::text AS kind,
          category,
          updated_at::text
        FROM legionhunt_wiki_tools
      ) items
      ORDER BY updated_at DESC
      LIMIT 16
    `)

    return NextResponse.json({
      recent: result.rows.map((row) => ({
        id: Number(row.id),
        title: row.title,
        kind: row.kind,
        category: row.category,
        updatedAt: row.updated_at,
      })),
    })
  } catch (error) {
    console.error("Dashboard recent error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить последние материалы." },
      { status: 500 },
    )
  }
}
