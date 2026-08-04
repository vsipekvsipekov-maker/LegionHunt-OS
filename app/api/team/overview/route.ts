import { NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET() {
  try {
    await ensureCrmSchema()
    const { rows } = await db.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE tm.status='online')::int AS online,
        COUNT(*) FILTER (WHERE r.name='Mentor')::int AS mentors,
        COUNT(*) FILTER (WHERE r.name='Student')::int AS students,
        COALESCE(ROUND(AVG(tm.kpi)),0)::int AS average_kpi
      FROM legionhunt_team_members tm
      LEFT JOIN legionhunt_team_roles r ON r.id=tm.role_id
    `)
    const progress = await db.query(`
      SELECT COALESCE(ROUND(AVG(progress_percent)),0)::int AS value
      FROM legionhunt_academy_progress
    `)
    const activity = await db.query(`
      SELECT a.id, a.title, a.description, a.event_type AS "eventType", a.created_at AS "createdAt",
             m.display_name AS "memberName"
      FROM legionhunt_team_activity a
      JOIN legionhunt_team_members m ON m.id=a.member_id
      ORDER BY a.created_at DESC LIMIT 8
    `)
    return NextResponse.json({
      stats: { ...rows[0], averageProgress: progress.rows[0]?.value ?? 0 },
      activity: activity.rows,
    })
  } catch (error) {
    console.error("Team overview error:", error)
    return NextResponse.json({ error: "Не удалось загрузить Team." }, { status: 500 })
  }
}
