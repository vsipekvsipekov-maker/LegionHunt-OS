import { NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET() {
  try {
    await ensureCrmSchema()
    const [roles, departments, mentors] = await Promise.all([
      db.query(`SELECT id::text, name FROM legionhunt_team_roles ORDER BY level DESC`),
      db.query(`SELECT id::text, name, color FROM legionhunt_team_departments ORDER BY name`),
      db.query(`SELECT tm.id::text, tm.display_name AS name FROM legionhunt_team_members tm JOIN legionhunt_team_roles r ON r.id=tm.role_id WHERE r.name IN ('Administrator','Leader','Mentor') ORDER BY tm.display_name`),
    ])
    return NextResponse.json({ roles: roles.rows, departments: departments.rows, mentors: mentors.rows })
  } catch (error) {
    console.error("Team meta error:", error)
    return NextResponse.json({ error: "Не удалось загрузить справочники." }, { status: 500 })
  }
}
