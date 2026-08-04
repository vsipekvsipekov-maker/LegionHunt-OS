import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type CourseRow = {
  id: string; title: string; slug: string; description: string; category: string;
  level: string; status: string; cover_emoji: string; estimated_minutes: number;
  modules_count: string; lessons_count: string; progress_percent: string;
}

const mapCourse = (row: CourseRow) => ({
  id: Number(row.id), title: row.title, slug: row.slug, description: row.description,
  category: row.category, level: row.level, status: row.status, coverEmoji: row.cover_emoji,
  estimatedMinutes: row.estimated_minutes, modulesCount: Number(row.modules_count),
  lessonsCount: Number(row.lessons_count), progressPercent: Number(row.progress_percent),
})

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const user = request.nextUrl.searchParams.get("user")?.trim() || "VSIPEK"
    const result = await db.query<CourseRow>(`
      SELECT c.id::text, c.title, c.slug, c.description, c.category, c.level, c.status,
        c.cover_emoji, c.estimated_minutes,
        COUNT(DISTINCT m.id)::text AS modules_count,
        COUNT(DISTINCT l.id)::text AS lessons_count,
        COALESCE(ROUND(100.0 * COUNT(DISTINCT l.id) FILTER (WHERE p.completed = TRUE) / NULLIF(COUNT(DISTINCT l.id), 0)), 0)::text AS progress_percent
      FROM legionhunt_academy_courses c
      LEFT JOIN legionhunt_academy_modules m ON m.course_id = c.id
      LEFT JOIN legionhunt_academy_lessons l ON l.module_id = m.id AND l.is_published = TRUE
      LEFT JOIN legionhunt_academy_progress p ON p.course_id = c.id AND p.user_name = $1
      WHERE c.status = 'published'
      GROUP BY c.id
      ORDER BY c.updated_at DESC, c.id ASC
    `, [user])
    return NextResponse.json({ courses: result.rows.map(mapCourse) })
  } catch (error) {
    console.error("Academy courses error:", error)
    return NextResponse.json({ error: "Не удалось загрузить курсы." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const body = await request.json() as { title?: string; description?: string; category?: string }
    const title = body.title?.trim()
    if (!title) return NextResponse.json({ error: "Название курса обязательно." }, { status: 400 })
    const slug = `${title.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "course"}-${Date.now().toString(36)}`
    const result = await db.query(`
      INSERT INTO legionhunt_academy_courses(title, slug, description, category)
      VALUES($1, $2, $3, $4)
      RETURNING id::text, title, slug
    `, [title, slug, body.description?.trim() || "", body.category?.trim() || "Основы"])
    return NextResponse.json({ course: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error("Create Academy course error:", error)
    return NextResponse.json({ error: "Не удалось создать курс." }, { status: 500 })
  }
}
