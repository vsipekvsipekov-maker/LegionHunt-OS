import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const member = await db.query(`
      SELECT tm.id::text, tm.display_name AS "displayName", tm.username, tm.email, tm.avatar_url AS "avatarUrl",
             tm.status, tm.kpi, tm.position_title AS "positionTitle", tm.bio, tm.joined_at AS "joinedAt",
             tm.last_seen_at AS "lastSeenAt", tm.role_id::text AS "roleId", tm.department_id::text AS "departmentId",
             tm.mentor_id::text AS "mentorId", r.name AS role, d.name AS department, mentor.display_name AS "mentorName",
             (SELECT COUNT(*)::int FROM legionhunt_team_members child WHERE child.mentor_id=tm.id) AS mentees
      FROM legionhunt_team_members tm
      LEFT JOIN legionhunt_team_roles r ON r.id=tm.role_id
      LEFT JOIN legionhunt_team_departments d ON d.id=tm.department_id
      LEFT JOIN legionhunt_team_members mentor ON mentor.id=tm.mentor_id
      WHERE tm.id=$1
    `,[id])
    if (!member.rowCount) return NextResponse.json({ error: "Участник не найден." }, { status: 404 })
    const [activity, notes, academy, certificates, achievements, kpiHistory] = await Promise.all([
      db.query(`SELECT id::text, event_type AS "eventType", title, description, created_at AS "createdAt" FROM legionhunt_team_activity WHERE member_id=$1 ORDER BY created_at DESC LIMIT 40`,[id]),
      db.query(`SELECT id::text, author, body, created_at AS "createdAt" FROM legionhunt_team_notes WHERE member_id=$1 ORDER BY created_at DESC`,[id]),
      db.query(`SELECT c.title, MAX(p.progress_percent)::int AS progress, BOOL_OR(p.completed) AS completed FROM legionhunt_team_members tm JOIN legionhunt_academy_progress p ON lower(p.user_name)=lower(tm.display_name) OR lower(p.user_name)=lower(replace(tm.username,'@','')) JOIN legionhunt_academy_courses c ON c.id=p.course_id WHERE tm.id=$1 GROUP BY c.id,c.title ORDER BY c.title`,[id]),
      db.query(`SELECT c.title, cert.certificate_code AS "certificateCode", cert.issued_at AS "issuedAt" FROM legionhunt_team_members tm JOIN legionhunt_academy_certificates cert ON lower(cert.user_name)=lower(tm.display_name) OR lower(cert.user_name)=lower(replace(tm.username,'@','')) JOIN legionhunt_academy_courses c ON c.id=cert.course_id WHERE tm.id=$1 ORDER BY cert.issued_at DESC`,[id]),
      db.query(`SELECT id::text, achievement_key AS "achievementKey", title, description, icon, awarded_at AS "awardedAt" FROM legionhunt_team_achievements WHERE member_id=$1 ORDER BY awarded_at DESC`,[id]),
      db.query(`SELECT value, source, recorded_at AS "recordedAt" FROM legionhunt_team_kpi_history WHERE member_id=$1 ORDER BY recorded_at ASC LIMIT 24`,[id]),
    ])
    const m = member.rows[0]
    const completedCourses = academy.rows.filter((x) => x.completed).length
    const avgProgress = academy.rows.length ? Math.round(academy.rows.reduce((sum, x) => sum + Number(x.progress || 0), 0) / academy.rows.length) : 0
    const summary = `${m.displayName} — ${m.role ?? "участник"} отдела ${m.department ?? "без отдела"}. KPI ${m.kpi}%, средний прогресс Academy ${avgProgress}%. Завершено курсов: ${completedCourses}, сертификатов: ${certificates.rowCount ?? 0}. ${m.status === "online" ? "Сейчас активен в системе." : "Сейчас не в сети."}`
    return NextResponse.json({ member: m, activity: activity.rows, notes: notes.rows, academy: academy.rows, certificates: certificates.rows, achievements: achievements.rows, kpiHistory: kpiHistory.rows, summary })
  } catch (error) {
    console.error("Team member detail error:", error)
    return NextResponse.json({ error: "Не удалось загрузить профиль." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const body = await request.json()
    const previous = await db.query(`SELECT kpi FROM legionhunt_team_members WHERE id=$1`, [id])
    const nextKpi = Number(body.kpi ?? 0)
    await db.query(`
      UPDATE legionhunt_team_members SET
        display_name=COALESCE(NULLIF($2,''),display_name), username=$3, email=$4,
        role_id=NULLIF($5,'')::bigint, department_id=NULLIF($6,'')::bigint, mentor_id=NULLIF($7,'')::bigint,
        status=$8, kpi=$9, position_title=$10, bio=$11, updated_at=NOW()
      WHERE id=$1
    `,[id,String(body.displayName ?? ""),String(body.username ?? ""),String(body.email ?? ""),String(body.roleId ?? ""),String(body.departmentId ?? ""),String(body.mentorId ?? ""),String(body.status ?? "offline"),nextKpi,String(body.positionTitle ?? ""),String(body.bio ?? "")])
    if (Number(previous.rows[0]?.kpi) !== nextKpi) {
      await db.query(`INSERT INTO legionhunt_team_kpi_history(member_id,value,source) VALUES($1,$2,'profile-update')`, [id, nextKpi])
      await db.query(`INSERT INTO legionhunt_team_activity(member_id,event_type,title,description) VALUES($1,'kpi','KPI обновлён',$2)`, [id, `Новое значение KPI: ${nextKpi}%`])
      if (nextKpi >= 90) await db.query(`INSERT INTO legionhunt_team_achievements(member_id,achievement_key,title,description,icon) VALUES($1,'kpi-90','Высокий KPI','KPI участника достиг уровня 90% или выше','⚡') ON CONFLICT(member_id,achievement_key) DO NOTHING`, [id])
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Update team member error:", error)
    return NextResponse.json({ error: "Не удалось обновить профиль." }, { status: 500 })
  }
}
