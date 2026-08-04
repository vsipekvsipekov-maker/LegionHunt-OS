import { NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET() {
  try {
    await ensureCrmSchema()
    const result = await db.query<{
      courses: string
      lessons: string
      learners: string
      completed: string
      average_progress: string
    }>(`
      SELECT
        (SELECT COUNT(*)::text FROM legionhunt_academy_courses WHERE status = 'published') AS courses,
        (SELECT COUNT(*)::text FROM legionhunt_academy_lessons WHERE is_published = TRUE) AS lessons,
        (SELECT COUNT(DISTINCT user_name)::text FROM legionhunt_academy_progress) AS learners,
        (SELECT COUNT(*)::text FROM legionhunt_academy_progress WHERE completed = TRUE) AS completed,
        COALESCE((SELECT ROUND(AVG(progress_percent))::text FROM legionhunt_academy_progress), '0') AS average_progress
    `)
    const row = result.rows[0]
    return NextResponse.json({
      stats: {
        courses: Number(row.courses),
        lessons: Number(row.lessons),
        learners: Number(row.learners),
        completed: Number(row.completed),
        averageProgress: Number(row.average_progress),
      },
    })
  } catch (error) {
    console.error("Academy overview error:", error)
    return NextResponse.json({ error: "Не удалось загрузить Academy." }, { status: 500 })
  }
}
