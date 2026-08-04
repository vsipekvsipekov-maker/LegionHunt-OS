import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

async function scalar(query: string, params: unknown[] = [], fallback = 0) {
  try {
    const result = await db.query(query, params)
    const value = Object.values(result.rows[0] ?? {})[0]
    return Number(value ?? fallback)
  } catch {
    return fallback
  }
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()

    const parsedDays = Number(request.nextUrl.searchParams.get("days") ?? 14)
    const days = [7, 14, 30].includes(parsedDays) ? parsedDays : 14

    const [
      teamTotal,
      teamOnline,
      averageKpi,
      academyProgress,
      completedLessons,
      certificates,
      wikiArticles,
      wikiViews,
      aiRequests,
      unanswered,
      crmCandidates,
    ] = await Promise.all([
      scalar("SELECT COUNT(*)::int value FROM legionhunt_team_members"),
      scalar("SELECT COUNT(*)::int value FROM legionhunt_team_members WHERE status='online'"),
      scalar("SELECT COALESCE(ROUND(AVG(kpi)),0)::int value FROM legionhunt_team_members"),
      scalar("SELECT COALESCE(ROUND(AVG(progress_percent)),0)::int value FROM legionhunt_academy_progress"),
      scalar("SELECT COUNT(*)::int value FROM legionhunt_academy_progress WHERE completed=TRUE"),
      scalar("SELECT COUNT(*)::int value FROM legionhunt_academy_certificates"),
      scalar("SELECT COUNT(*)::int value FROM legionhunt_wiki_articles"),
      scalar("SELECT COUNT(*)::int value FROM legionhunt_wiki_views"),
      scalar("SELECT COUNT(*)::int value FROM legionhunt_wiki_ai_messages WHERE role='user'"),
      scalar("SELECT COUNT(*)::int value FROM legionhunt_ai_learning_queue WHERE status='pending'"),
      scalar("SELECT COUNT(*)::int value FROM legionhunt_candidates"),
    ])

    const periodQuery = async (tableExpression: string, dateColumn: string) => {
      const current = await scalar(
        `SELECT COUNT(*)::int value FROM ${tableExpression} WHERE ${dateColumn} >= NOW() - ($1::int * INTERVAL '1 day')`,
        [days],
      )
      const previous = await scalar(
        `SELECT COUNT(*)::int value FROM ${tableExpression}
         WHERE ${dateColumn} < NOW() - ($1::int * INTERVAL '1 day')
           AND ${dateColumn} >= NOW() - ($1::int * INTERVAL '2 day')`,
        [days],
      )
      return { current, previous, change: percentChange(current, previous) }
    }

    const [teamPeriod, academyPeriod, wikiPeriod, aiPeriod, crmPeriod] = await Promise.all([
      periodQuery("legionhunt_team_members", "joined_at"),
      periodQuery("legionhunt_academy_progress", "completed_at"),
      periodQuery("legionhunt_wiki_views", "viewed_at"),
      periodQuery("legionhunt_wiki_ai_messages", "created_at"),
      periodQuery("legionhunt_candidates", "created_at"),
    ])

    const leaders = await db.query(`
      SELECT tm.id::text, tm.display_name AS "displayName", tm.position_title AS "positionTitle",
             tm.kpi, COALESCE(r.name,'Member') AS role,
             COALESCE((SELECT ROUND(AVG(p.progress_percent))::int FROM legionhunt_academy_progress p WHERE p.user_name=tm.username),0) AS "academyProgress"
      FROM legionhunt_team_members tm
      LEFT JOIN legionhunt_team_roles r ON r.id=tm.role_id
      ORDER BY tm.kpi DESC, tm.display_name ASC
      LIMIT 6
    `)

    const popular = await db.query(`
      SELECT a.id::text, a.title, a.category, COUNT(v.id)::int AS views
      FROM legionhunt_wiki_articles a
      LEFT JOIN legionhunt_wiki_views v ON v.article_id=a.id
      GROUP BY a.id
      ORDER BY views DESC, a.updated_at DESC
      LIMIT 6
    `)

    const funnelResult = await db.query(`
      SELECT status, COUNT(*)::int AS count
      FROM legionhunt_candidates
      GROUP BY status
    `)
    const funnelMap = Object.fromEntries(funnelResult.rows.map((row) => [row.status, Number(row.count)]))

    return NextResponse.json({
      days,
      metrics: {
        teamTotal,
        teamOnline,
        averageKpi,
        academyProgress,
        completedLessons,
        certificates,
        wikiArticles,
        wikiViews,
        aiRequests,
        unanswered,
        crmCandidates,
      },
      period: {
        team: teamPeriod,
        academy: academyPeriod,
        wiki: wikiPeriod,
        ai: aiPeriod,
        crm: crmPeriod,
      },
      funnel: [
        { key: "new", label: "Новые", value: funnelMap.new ?? 0 },
        { key: "contact", label: "Контакт", value: funnelMap.contact ?? 0 },
        { key: "call", label: "Созвон", value: funnelMap.call ?? 0 },
        { key: "training", label: "Обучение", value: funnelMap.training ?? 0 },
        { key: "active", label: "Активные", value: funnelMap.active ?? 0 },
      ],
      leaders: leaders.rows,
      popularArticles: popular.rows,
    })
  } catch (error) {
    console.error("Analytics overview error:", error)
    return NextResponse.json({ error: "Не удалось загрузить аналитику." }, { status: 500 })
  }
}
