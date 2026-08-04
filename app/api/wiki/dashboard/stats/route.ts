import { NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET() {
  try {
    await ensureCrmSchema()

    const result = await db.query<{
      articles: string
      cases: string
      regulations: string
      tools: string
      favorites: string
      recent: string
      activities_today: string
    }>(`
      SELECT
        (SELECT COUNT(*)::text FROM legionhunt_wiki_articles) AS articles,
        (SELECT COUNT(*)::text FROM legionhunt_wiki_cases) AS cases,
        (SELECT COUNT(*)::text FROM legionhunt_wiki_regulations) AS regulations,
        (SELECT COUNT(*)::text FROM legionhunt_wiki_tools) AS tools,
        (
          SELECT (
            (SELECT COUNT(*) FROM legionhunt_wiki_favorites) +
            (SELECT COUNT(*) FROM legionhunt_wiki_tool_favorites)
          )::text
        ) AS favorites,
        (SELECT COUNT(*)::text FROM legionhunt_wiki_recent) AS recent,
        (
          SELECT COUNT(*)::text
          FROM legionhunt_activity
          WHERE created_at >= date_trunc('day', NOW())
        ) AS activities_today
    `)

    const row = result.rows[0]

    return NextResponse.json({
      stats: {
        articles: Number(row.articles),
        cases: Number(row.cases),
        regulations: Number(row.regulations),
        tools: Number(row.tools),
        favorites: Number(row.favorites),
        recent: Number(row.recent),
        activitiesToday: Number(row.activities_today),
      },
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить статистику Dashboard." },
      { status: 500 },
    )
  }
}
