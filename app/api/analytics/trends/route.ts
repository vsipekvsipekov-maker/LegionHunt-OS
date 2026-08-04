import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

const allowedSources = new Set(["all", "team", "crm", "academy", "wiki", "ai"])

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const parsedDays = Number(request.nextUrl.searchParams.get("days") ?? 14)
    const days = [7, 14, 30].includes(parsedDays) ? parsedDays : 14
    const rawSource = (request.nextUrl.searchParams.get("source") ?? "all").toLowerCase()
    const source = allowedSources.has(rawSource) ? rawSource : "all"

    const sourceConditions: Record<string, string> = {
      team: "source = 'team'",
      crm: "source = 'crm'",
      academy: "source = 'academy'",
      wiki: "source = 'wiki'",
      ai: "source = 'ai'",
      all: "TRUE",
    }

    const { rows } = await db.query(`
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day'), CURRENT_DATE, INTERVAL '1 day')::date AS day
      ), events AS (
        SELECT created_at::date day, COUNT(*)::int total, 'team'::text source FROM legionhunt_team_activity GROUP BY 1
        UNION ALL SELECT created_at::date, COUNT(*)::int, 'crm' FROM legionhunt_candidate_activity GROUP BY 1
        UNION ALL SELECT viewed_at::date, COUNT(*)::int, 'wiki' FROM legionhunt_wiki_views GROUP BY 1
        UNION ALL SELECT created_at::date, COUNT(*)::int, 'ai' FROM legionhunt_wiki_ai_messages WHERE role='user' GROUP BY 1
        UNION ALL SELECT completed_at::date, COUNT(*)::int, 'academy' FROM legionhunt_academy_progress WHERE completed=TRUE AND completed_at IS NOT NULL GROUP BY 1
      )
      SELECT to_char(d.day,'DD.MM') AS label, COALESCE(SUM(e.total) FILTER (WHERE ${sourceConditions[source]}),0)::int AS value
      FROM days d LEFT JOIN events e ON e.day=d.day
      GROUP BY d.day ORDER BY d.day
    `, [days])

    return NextResponse.json({ points: rows, days, source })
  } catch (error) {
    console.error("Analytics trends error:", error)
    return NextResponse.json({ points: [] })
  }
}
