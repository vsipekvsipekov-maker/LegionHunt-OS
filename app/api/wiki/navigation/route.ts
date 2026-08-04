import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type ArticleRow = {
  id: string
  title: string
  slug: string
  category: string
  excerpt: string
  is_favorite: boolean
  updated_at: string
}

function serialize(row: ArticleRow) {
  return {
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    category: row.category,
    excerpt: row.excerpt,
    isFavorite: row.is_favorite,
    updatedAt: row.updated_at,
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()

    const user = request.nextUrl.searchParams.get("user")?.trim() || "VSIPEK"

    const [favorites, recent] = await Promise.all([
      db.query<ArticleRow>(
        `
          SELECT
            a.id::text,
            a.title,
            a.slug,
            a.category,
            a.excerpt,
            TRUE AS is_favorite,
            a.updated_at::text
          FROM legionhunt_wiki_favorites f
          JOIN legionhunt_wiki_articles a ON a.id = f.article_id
          WHERE f.user_name = $1
          ORDER BY f.created_at DESC
          LIMIT 10
        `,
        [user],
      ),
      db.query<ArticleRow>(
        `
          SELECT
            a.id::text,
            a.title,
            a.slug,
            a.category,
            a.excerpt,
            EXISTS(
              SELECT 1
              FROM legionhunt_wiki_favorites f
              WHERE f.article_id = a.id AND f.user_name = $1
            ) AS is_favorite,
            a.updated_at::text
          FROM legionhunt_wiki_recent r
          JOIN legionhunt_wiki_articles a ON a.id = r.article_id
          WHERE r.user_name = $1
          ORDER BY r.opened_at DESC
          LIMIT 8
        `,
        [user],
      ),
    ])

    return NextResponse.json({
      favorites: favorites.rows.map(serialize),
      recent: recent.rows.map(serialize),
    })
  } catch (error) {
    console.error("Wiki navigation GET error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить навигацию Wiki." },
      { status: 500 },
    )
  }
}
