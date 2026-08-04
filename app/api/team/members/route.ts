import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
    const role = request.nextUrl.searchParams.get("role")?.trim() ?? ""
    const department = request.nextUrl.searchParams.get("department")?.trim() ?? ""
    const status = request.nextUrl.searchParams.get("status")?.trim() ?? ""
    const { rows } = await db.query(`
      SELECT tm.id::text, tm.display_name AS "displayName", tm.username, tm.email,
             tm.avatar_url AS "avatarUrl", tm.status, tm.kpi, tm.position_title AS "positionTitle",
             tm.bio, tm.joined_at AS "joinedAt", tm.last_seen_at AS "lastSeenAt",
             r.name AS role, d.name AS department,
             mentor.display_name AS "mentorName", mentor.id::text AS "mentorId",
             (SELECT COUNT(*)::int FROM legionhunt_team_members child WHERE child.mentor_id=tm.id) AS mentees,
             COALESCE((SELECT ROUND(AVG(p.progress_percent))::int FROM legionhunt_academy_progress p WHERE lower(p.user_name)=lower(tm.display_name) OR lower(p.user_name)=lower(replace(tm.username,'@',''))),0) AS "academyProgress"
      FROM legionhunt_team_members tm
      LEFT JOIN legionhunt_team_roles r ON r.id=tm.role_id
      LEFT JOIN legionhunt_team_departments d ON d.id=tm.department_id
      LEFT JOIN legionhunt_team_members mentor ON mentor.id=tm.mentor_id
      WHERE ($1='' OR tm.display_name ILIKE '%'||$1||'%' OR tm.username ILIKE '%'||$1||'%')
        AND ($2='' OR r.name=$2)
        AND ($3='' OR d.name=$3)
        AND ($4='' OR tm.status=$4)
      ORDER BY CASE WHEN tm.status='online' THEN 0 ELSE 1 END, tm.kpi DESC, tm.display_name
    `, [q, role, department, status])
    return NextResponse.json({ members: rows })
  } catch (error) {
    console.error("Team members error:", error)
    return NextResponse.json({ error: "Не удалось загрузить участников." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const body = await request.json()
    const displayName = String(body.displayName ?? "").trim()
    if (!displayName) return NextResponse.json({ error: "Укажите имя." }, { status: 400 })
    const { rows } = await db.query(`
      INSERT INTO legionhunt_team_members
        (display_name, username, email, role_id, department_id, mentor_id, status, kpi, position_title, bio)
      VALUES ($1,$2,$3,NULLIF($4,'')::bigint,NULLIF($5,'')::bigint,NULLIF($6,'')::bigint,$7,$8,$9,$10)
      RETURNING id::text
    `, [displayName, String(body.username ?? ""), String(body.email ?? ""), String(body.roleId ?? ""), String(body.departmentId ?? ""), String(body.mentorId ?? ""), String(body.status ?? "online"), Number(body.kpi ?? 70), String(body.positionTitle ?? ""), String(body.bio ?? "")])
    return NextResponse.json({ id: rows[0].id }, { status: 201 })
  } catch (error) {
    console.error("Create team member error:", error)
    return NextResponse.json({ error: "Не удалось создать участника." }, { status: 500 })
  }
}
