import { NextRequest, NextResponse } from "next/server"

import { db, ensureCrmSchema } from "@/lib/db"

type Row = {
  id: string
  title: string
  slug: string
  category: string
  content: string
  excerpt: string
  is_favorite: boolean
  author: string
  created_at: string
  updated_at: string
}

const map = (row: Row) => ({
  id: Number(row.id),
  title: row.title,
  slug: row.slug,
  category: row.category,
  content: row.content,
  excerpt: row.excerpt,
  isFavorite: row.is_favorite,
  author: row.author,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()

    const { id } = await context.params
    const articleId = Number(id)

    if (!Number.isInteger(articleId) || articleId <= 0) {
      return NextResponse.json(
        { error: "Некорректный идентификатор статьи." },
        { status: 400 },
      )
    }

    const body = (await request.json()) as {
      title?: string
      category?: string
      content?: string
      excerpt?: string
      isFavorite?: boolean
      changeNote?: string
    }

    const updates: string[] = []
    const values: Array<string | boolean | number> = []

    const add = (column: string, value: string | boolean | number) => {
      values.push(value)
      updates.push(`${column}=$${values.length}`)
    }

    if (body.title !== undefined) add("title", body.title.trim())
    if (body.category !== undefined) add("category", body.category.trim())
    if (body.content !== undefined) add("content", body.content)
    if (body.excerpt !== undefined) add("excerpt", body.excerpt.trim())
    if (body.isFavorite !== undefined) {
      add("is_favorite", body.isFavorite)
    }

    if (!updates.length) {
      return NextResponse.json(
        { error: "Нет изменений." },
        { status: 400 },
      )
    }

    const previous = await db.query<{
      title: string
      category: string
      excerpt: string
      content: string
      author: string
    }>(
      `SELECT title, category, excerpt, content, author
       FROM legionhunt_wiki_articles
       WHERE id = $1`,
      [articleId],
    )

    if (!previous.rows[0]) {
      return NextResponse.json(
        { error: "Статья не найдена." },
        { status: 404 },
      )
    }

    const versionResult = await db.query<{ next_version: number }>(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
       FROM legionhunt_wiki_versions
       WHERE article_id = $1`,
      [articleId],
    )

    await db.query(
      `INSERT INTO legionhunt_wiki_versions
        (article_id, version_number, title, category, excerpt, content, author, change_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        articleId,
        versionResult.rows[0]?.next_version ?? 1,
        previous.rows[0].title,
        previous.rows[0].category,
        previous.rows[0].excerpt,
        previous.rows[0].content,
        previous.rows[0].author,
        body.changeNote?.trim() || "Изменение статьи",
      ],
    )

    updates.push("updated_at=NOW()")
    values.push(articleId)

    const result = await db.query<Row>(
      `UPDATE legionhunt_wiki_articles
       SET ${updates.join(",")}
       WHERE id=$${values.length}
       RETURNING id::text,title,slug,category,content,excerpt,is_favorite,author,created_at::text,updated_at::text`,
      values,
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Статья не найдена." },
        { status: 404 },
      )
    }

    return NextResponse.json({ article: map(result.rows[0]) })
  } catch (error) {
    console.error("Wiki article PATCH error:", error)
    return NextResponse.json(
      { error: "Не удалось сохранить статью." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()

    const { id } = await context.params
    const articleId = Number(id)

    if (!Number.isInteger(articleId) || articleId <= 0) {
      return NextResponse.json(
        { error: "Некорректный идентификатор статьи." },
        { status: 400 },
      )
    }

    const result = await db.query<{ id: string }>(
      `DELETE FROM legionhunt_wiki_articles
       WHERE id = $1
       RETURNING id::text`,
      [articleId],
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Статья не найдена." },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      deletedId: Number(result.rows[0].id),
    })
  } catch (error) {
    console.error("Wiki article DELETE error:", error)
    return NextResponse.json(
      { error: "Не удалось удалить статью." },
      { status: 500 },
    )
  }
}
