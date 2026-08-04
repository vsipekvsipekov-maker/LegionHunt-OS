import { NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type VersionRow = {
  id: string
  version_number: number
  title: string
  category: string
  excerpt: string
  content: string
  author: string
  change_note: string
  created_at: string
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const articleId = Number(id)

    if (!Number.isSafeInteger(articleId) || articleId <= 0) {
      return NextResponse.json({ error: "Некорректный ID." }, { status: 400 })
    }

    const result = await db.query<VersionRow>(
      `
        SELECT
          id::text,
          version_number,
          title,
          category,
          excerpt,
          content,
          author,
          change_note,
          created_at::text
        FROM legionhunt_wiki_versions
        WHERE article_id = $1
        ORDER BY version_number DESC
        LIMIT 30
      `,
      [articleId],
    )

    return NextResponse.json({
      versions: result.rows.map((row) => ({
        id: Number(row.id),
        versionNumber: row.version_number,
        title: row.title,
        category: row.category,
        excerpt: row.excerpt,
        content: row.content,
        author: row.author,
        changeNote: row.change_note,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    console.error("Wiki versions GET error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить историю версий." },
      { status: 500 },
    )
  }
}
