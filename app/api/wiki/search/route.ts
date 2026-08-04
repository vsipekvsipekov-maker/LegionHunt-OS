import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type SearchRow = {
  id: string
  kind: "article" | "case" | "regulation" | "tool"
  title: string
  category: string
  snippet: string
  tags: string[]
  updated_at: string
  score: number
}

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? ""
    const type = request.nextUrl.searchParams.get("type")?.trim() ?? "all"
    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 30), 1),
      60,
    )

    if (query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const pattern = `%${query}%`
    const values: Array<string | number> = [query, pattern]
    let typeSql = ""

    if (
      type === "article" ||
      type === "case" ||
      type === "regulation" ||
      type === "tool"
    ) {
      values.push(type)
      typeSql = `WHERE kind = $${values.length}`
    }

    values.push(limit)

    const result = await db.query<SearchRow>(
      `
        WITH search_items AS (
          SELECT
            id::text,
            'article'::text AS kind,
            title,
            category,
            LEFT(COALESCE(NULLIF(excerpt, ''), content), 340) AS snippet,
            ARRAY[]::text[] AS tags,
            updated_at::text,
            (
              CASE WHEN LOWER(title) = LOWER($1) THEN 100 ELSE 0 END +
              CASE WHEN title ILIKE $2 THEN 42 ELSE 0 END +
              CASE WHEN category ILIKE $2 THEN 18 ELSE 0 END +
              CASE WHEN excerpt ILIKE $2 THEN 14 ELSE 0 END +
              CASE WHEN content ILIKE $2 THEN 8 ELSE 0 END
            )::int AS score
          FROM legionhunt_wiki_articles
          WHERE
            title ILIKE $2 OR
            category ILIKE $2 OR
            excerpt ILIKE $2 OR
            content ILIKE $2

          UNION ALL

          SELECT
            id::text,
            'case'::text AS kind,
            title,
            category,
            LEFT(
              CONCAT_WS(' ', situation, problem, solution, result, lessons),
              340
            ) AS snippet,
            tags,
            updated_at::text,
            (
              CASE WHEN LOWER(title) = LOWER($1) THEN 100 ELSE 0 END +
              CASE WHEN title ILIKE $2 THEN 42 ELSE 0 END +
              CASE WHEN category ILIKE $2 THEN 18 ELSE 0 END +
              CASE WHEN array_to_string(tags, ' ') ILIKE $2 THEN 18 ELSE 0 END +
              CASE WHEN situation ILIKE $2 THEN 12 ELSE 0 END +
              CASE WHEN problem ILIKE $2 THEN 10 ELSE 0 END +
              CASE WHEN solution ILIKE $2 THEN 10 ELSE 0 END +
              CASE WHEN result ILIKE $2 THEN 8 ELSE 0 END
            )::int AS score
          FROM legionhunt_wiki_cases
          WHERE
            title ILIKE $2 OR
            category ILIKE $2 OR
            array_to_string(tags, ' ') ILIKE $2 OR
            situation ILIKE $2 OR
            problem ILIKE $2 OR
            solution ILIKE $2 OR
            result ILIKE $2 OR
            lessons ILIKE $2

          UNION ALL

          SELECT
            id::text,
            'regulation'::text AS kind,
            title,
            category,
            LEFT(CONCAT_WS(' ', summary, content), 340) AS snippet,
            tags,
            updated_at::text,
            (
              CASE WHEN LOWER(title) = LOWER($1) THEN 100 ELSE 0 END +
              CASE WHEN title ILIKE $2 THEN 42 ELSE 0 END +
              CASE WHEN category ILIKE $2 THEN 18 ELSE 0 END +
              CASE WHEN array_to_string(tags, ' ') ILIKE $2 THEN 18 ELSE 0 END +
              CASE WHEN summary ILIKE $2 THEN 14 ELSE 0 END +
              CASE WHEN content ILIKE $2 THEN 9 ELSE 0 END
            )::int AS score
          FROM legionhunt_wiki_regulations
          WHERE
            title ILIKE $2 OR
            category ILIKE $2 OR
            array_to_string(tags, ' ') ILIKE $2 OR
            summary ILIKE $2 OR
            content ILIKE $2

          UNION ALL

          SELECT
            id::text,
            'tool'::text AS kind,
            name AS title,
            category,
            LEFT(CONCAT_WS(' ', description, instructions), 340) AS snippet,
            tags,
            updated_at::text,
            (
              CASE WHEN LOWER(name) = LOWER($1) THEN 100 ELSE 0 END +
              CASE WHEN name ILIKE $2 THEN 42 ELSE 0 END +
              CASE WHEN category ILIKE $2 THEN 18 ELSE 0 END +
              CASE WHEN array_to_string(tags, ' ') ILIKE $2 THEN 18 ELSE 0 END +
              CASE WHEN description ILIKE $2 THEN 14 ELSE 0 END +
              CASE WHEN instructions ILIKE $2 THEN 9 ELSE 0 END
            )::int AS score
          FROM legionhunt_wiki_tools
          WHERE
            status <> 'archived' AND (
              name ILIKE $2 OR
              category ILIKE $2 OR
              array_to_string(tags, ' ') ILIKE $2 OR
              description ILIKE $2 OR
              instructions ILIKE $2
            )
        )
        SELECT *
        FROM search_items
        ${typeSql}
        ORDER BY score DESC, updated_at DESC
        LIMIT $${values.length}
      `,
      values,
    )

    return NextResponse.json({
      query,
      results: result.rows.map((row) => ({
        id: Number(row.id),
        kind: row.kind,
        title: row.title,
        category: row.category,
        snippet: row.snippet,
        tags: row.tags ?? [],
        updatedAt: row.updated_at,
        score: Number(row.score),
      })),
    })
  } catch (error) {
    console.error("Global search error:", error)
    return NextResponse.json(
      { error: "Не удалось выполнить глобальный поиск." },
      { status: 500 },
    )
  }
}
