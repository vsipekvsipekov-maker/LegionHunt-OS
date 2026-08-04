import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 120)
}

export async function PATCH(request: NextRequest, context: Context) {
  const client = await db.connect()
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const queueId = Number(id)
    if (!Number.isSafeInteger(queueId) || queueId <= 0) {
      return NextResponse.json({ error: "Некорректный вопрос." }, { status: 400 })
    }
    const body = (await request.json()) as { answer?: string; action?: "learn" | "ignore"; category?: string; user?: string }
    const action = body.action || "learn"
    const user = body.user?.trim().slice(0,160) || "VSIPEK"

    await client.query("BEGIN")
    const found = await client.query(
      `SELECT id,question,status FROM legionhunt_ai_learning_queue WHERE id=$1 FOR UPDATE`, [queueId],
    )
    if (!found.rowCount) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Вопрос не найден." }, { status: 404 })
    }
    if (action === "ignore") {
      await client.query(
        `UPDATE legionhunt_ai_learning_queue SET status='ignored',updated_at=NOW(),resolved_at=NOW() WHERE id=$1`, [queueId],
      )
      await client.query("COMMIT")
      return NextResponse.json({ ok: true, status: "ignored" })
    }

    const answer = body.answer?.trim().slice(0, 20000)
    if (!answer || answer.length < 10) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Введите содержательный ответ минимум из 10 символов." }, { status: 400 })
    }
    const question = String(found.rows[0].question)
    const category = body.category?.trim().slice(0,120) || "AI Learning"
    const baseSlug = slugify(question) || `ai-learning-${queueId}`
    const slug = `${baseSlug}-${queueId}`
    const article = await client.query<{ id: string }>(
      `INSERT INTO legionhunt_wiki_articles(title,slug,category,content,excerpt,author)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id::text`,
      [question, slug, category, answer, answer.slice(0,320), user],
    )
    const articleId = Number(article.rows[0].id)
    await client.query(
      `UPDATE legionhunt_ai_learning_queue
       SET status='learned',answer=$2,article_id=$3,updated_at=NOW(),resolved_at=NOW()
       WHERE id=$1`, [queueId, answer, articleId],
    )
    await client.query(
      `INSERT INTO legionhunt_activity(actor,action,entity_type,entity_id,entity_title,metadata)
       VALUES($1,'ai_learning_created','article',$2,$3,$4::jsonb)`,
      [user, articleId, question, JSON.stringify({ learningQueueId: queueId })],
    )
    await client.query("COMMIT")
    return NextResponse.json({ ok: true, status: "learned", articleId })
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    console.error("AI learning update error:", error)
    return NextResponse.json({ error: "Не удалось сохранить обучение." }, { status: 500 })
  } finally {
    client.release()
  }
}
