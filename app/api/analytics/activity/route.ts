import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 30)
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 30, 1), 100)

    const { rows } = await db.query(`
      SELECT * FROM (
        SELECT ('team-' || a.id)::text AS id, 'Team'::text AS source, a.event_type AS type,
               a.title, a.description, a.created_at AS "createdAt", m.display_name AS actor
        FROM legionhunt_team_activity a
        JOIN legionhunt_team_members m ON m.id=a.member_id
        UNION ALL
        SELECT ('crm-' || a.id)::text, 'CRM', a.event_type, a.title, a.description,
               a.created_at, c.name
        FROM legionhunt_candidate_activity a
        JOIN legionhunt_candidates c ON c.id=a.candidate_id
        UNION ALL
        SELECT ('wiki-' || v.id)::text, 'Wiki', 'view', 'Открыта статья', w.title,
               v.viewed_at, v.viewer
        FROM legionhunt_wiki_views v
        JOIN legionhunt_wiki_articles w ON w.id=v.article_id
        UNION ALL
        SELECT ('academy-' || p.id)::text, 'Academy', 'lesson', 'Урок завершён', l.title,
               p.completed_at, p.user_name
        FROM legionhunt_academy_progress p
        JOIN legionhunt_academy_lessons l ON l.id=p.lesson_id
        WHERE p.completed=TRUE AND p.completed_at IS NOT NULL
        UNION ALL
        SELECT ('ai-' || m.id)::text, 'AI', 'prompt', 'AI-запрос', LEFT(m.content,180),
               m.created_at, m.created_by
        FROM legionhunt_wiki_ai_messages m
        WHERE m.role='user'
      ) events
      ORDER BY "createdAt" DESC
      LIMIT $1
    `, [limit])
    return NextResponse.json({ events: rows })
  } catch (error) {
    console.error("Analytics activity error:", error)
    return NextResponse.json({ events: [] })
  }
}
