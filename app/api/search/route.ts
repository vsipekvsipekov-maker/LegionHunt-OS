import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type SearchRow = {
  id: string
  type: "team" | "crm" | "academy" | "wiki"
  subtype: string
  title: string
  subtitle: string
  meta: string
  href: string
  score: number
}

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? ""
    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 28), 4),
      50,
    )

    if (query.length < 2) {
      return NextResponse.json({ query, results: [] })
    }

    const pattern = `%${query}%`
    const result = await db.query<SearchRow>(
      `
        WITH search_items AS (
          SELECT
            tm.id::text AS id,
            'team'::text AS type,
            'member'::text AS subtype,
            tm.display_name AS title,
            CONCAT_WS(' · ', NULLIF(tm.username, ''), r.name, d.name) AS subtitle,
            CONCAT('KPI ', tm.kpi, '% · ', CASE tm.status WHEN 'online' THEN 'Онлайн' WHEN 'vacation' THEN 'В отпуске' WHEN 'inactive' THEN 'Неактивен' ELSE 'Оффлайн' END) AS meta,
            '/team'::text AS href,
            (
              CASE WHEN LOWER(tm.display_name) = LOWER($1) THEN 120 ELSE 0 END +
              CASE WHEN tm.display_name ILIKE $2 THEN 55 ELSE 0 END +
              CASE WHEN tm.username ILIKE $2 THEN 42 ELSE 0 END +
              CASE WHEN r.name ILIKE $2 OR d.name ILIKE $2 THEN 20 ELSE 0 END
            )::int AS score
          FROM legionhunt_team_members tm
          LEFT JOIN legionhunt_team_roles r ON r.id = tm.role_id
          LEFT JOIN legionhunt_team_departments d ON d.id = tm.department_id
          WHERE tm.display_name ILIKE $2 OR tm.username ILIKE $2 OR tm.email ILIKE $2 OR r.name ILIKE $2 OR d.name ILIKE $2

          UNION ALL

          SELECT
            c.id::text,
            'crm'::text,
            'candidate'::text,
            c.name,
            CONCAT_WS(' · ', NULLIF(c.username, ''), NULLIF(c.country, ''), NULLIF(c.source, '')),
            CONCAT('Этап: ', c.status, ' · Score ', c.score),
            '/crm'::text,
            (
              CASE WHEN LOWER(c.name) = LOWER($1) THEN 120 ELSE 0 END +
              CASE WHEN c.name ILIKE $2 THEN 55 ELSE 0 END +
              CASE WHEN c.username ILIKE $2 THEN 42 ELSE 0 END +
              CASE WHEN c.country ILIKE $2 OR c.source ILIKE $2 OR c.mentor ILIKE $2 THEN 18 ELSE 0 END +
              CASE WHEN c.note ILIKE $2 OR c.next_action ILIKE $2 THEN 10 ELSE 0 END
            )::int
          FROM legionhunt_candidates c
          WHERE c.name ILIKE $2 OR c.username ILIKE $2 OR c.country ILIKE $2 OR c.source ILIKE $2 OR c.mentor ILIKE $2 OR c.note ILIKE $2 OR c.next_action ILIKE $2

          UNION ALL

          SELECT
            ac.id::text,
            'academy'::text,
            'course'::text,
            ac.title,
            CONCAT_WS(' · ', ac.category, ac.level),
            CONCAT(COUNT(DISTINCT al.id), ' уроков · ', ac.estimated_minutes, ' мин'),
            '/academy'::text,
            (
              CASE WHEN LOWER(ac.title) = LOWER($1) THEN 120 ELSE 0 END +
              CASE WHEN ac.title ILIKE $2 THEN 55 ELSE 0 END +
              CASE WHEN ac.category ILIKE $2 THEN 24 ELSE 0 END +
              CASE WHEN ac.description ILIKE $2 THEN 15 ELSE 0 END
            )::int
          FROM legionhunt_academy_courses ac
          LEFT JOIN legionhunt_academy_modules am ON am.course_id = ac.id
          LEFT JOIN legionhunt_academy_lessons al ON al.module_id = am.id AND al.is_published = TRUE
          WHERE ac.status = 'published' AND (ac.title ILIKE $2 OR ac.category ILIKE $2 OR ac.description ILIKE $2)
          GROUP BY ac.id

          UNION ALL

          SELECT id, 'wiki'::text, subtype, title, subtitle, meta, href, score
          FROM (
            SELECT
              wa.id::text AS id,
              'article'::text AS subtype,
              wa.title,
              wa.category AS subtitle,
              LEFT(COALESCE(NULLIF(wa.excerpt, ''), wa.content), 110) AS meta,
              '/wiki'::text AS href,
              (CASE WHEN LOWER(wa.title)=LOWER($1) THEN 120 ELSE 0 END + CASE WHEN wa.title ILIKE $2 THEN 55 ELSE 0 END + CASE WHEN wa.category ILIKE $2 THEN 22 ELSE 0 END + CASE WHEN wa.excerpt ILIKE $2 OR wa.content ILIKE $2 THEN 12 ELSE 0 END)::int AS score
            FROM legionhunt_wiki_articles wa
            WHERE wa.title ILIKE $2 OR wa.category ILIKE $2 OR wa.excerpt ILIKE $2 OR wa.content ILIKE $2

            UNION ALL

            SELECT wc.id::text, 'case'::text, wc.title, wc.category, LEFT(CONCAT_WS(' ', wc.problem, wc.solution), 110), '/wiki'::text,
              (CASE WHEN LOWER(wc.title)=LOWER($1) THEN 120 ELSE 0 END + CASE WHEN wc.title ILIKE $2 THEN 55 ELSE 0 END + CASE WHEN wc.category ILIKE $2 THEN 22 ELSE 0 END + CASE WHEN wc.problem ILIKE $2 OR wc.solution ILIKE $2 THEN 12 ELSE 0 END)::int
            FROM legionhunt_wiki_cases wc
            WHERE wc.title ILIKE $2 OR wc.category ILIKE $2 OR wc.problem ILIKE $2 OR wc.solution ILIKE $2

            UNION ALL

            SELECT wr.id::text, 'regulation'::text, wr.title, wr.category, LEFT(CONCAT_WS(' ', wr.summary, wr.content), 110), '/wiki'::text,
              (CASE WHEN LOWER(wr.title)=LOWER($1) THEN 120 ELSE 0 END + CASE WHEN wr.title ILIKE $2 THEN 55 ELSE 0 END + CASE WHEN wr.category ILIKE $2 THEN 22 ELSE 0 END + CASE WHEN wr.summary ILIKE $2 OR wr.content ILIKE $2 THEN 12 ELSE 0 END)::int
            FROM legionhunt_wiki_regulations wr
            WHERE wr.title ILIKE $2 OR wr.category ILIKE $2 OR wr.summary ILIKE $2 OR wr.content ILIKE $2

            UNION ALL

            SELECT wt.id::text, 'tool'::text, wt.name, wt.category, LEFT(CONCAT_WS(' ', wt.description, wt.instructions), 110), '/wiki'::text,
              (CASE WHEN LOWER(wt.name)=LOWER($1) THEN 120 ELSE 0 END + CASE WHEN wt.name ILIKE $2 THEN 55 ELSE 0 END + CASE WHEN wt.category ILIKE $2 THEN 22 ELSE 0 END + CASE WHEN wt.description ILIKE $2 OR wt.instructions ILIKE $2 THEN 12 ELSE 0 END)::int
            FROM legionhunt_wiki_tools wt
            WHERE wt.status <> 'archived' AND (wt.name ILIKE $2 OR wt.category ILIKE $2 OR wt.description ILIKE $2 OR wt.instructions ILIKE $2)
          ) wiki_items
        )
        SELECT * FROM search_items
        ORDER BY score DESC, type, title
        LIMIT $3
      `,
      [query, pattern, limit],
    )

    return NextResponse.json({ query, results: result.rows })
  } catch (error) {
    console.error("Unified search error:", error)
    return NextResponse.json(
      { error: "Не удалось выполнить поиск по LegionHunt." },
      { status: 500 },
    )
  }
}
