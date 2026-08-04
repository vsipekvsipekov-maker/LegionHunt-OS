import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export const runtime = "nodejs"
export const maxDuration = 60

type ArticleRow = {
  title: string
  category: string
  excerpt: string
  content: string
}

type MessageRow = {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

type GeminiPayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  error?: {
    message?: string
  }
}

function serializeMessage(row: MessageRow) {
  return {
    id: Number(row.id),
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }
}

async function askGemini({
  apiKey,
  model,
  article,
  question,
  mode,
}: {
  apiKey: string
  model: string
  article: ArticleRow
  question: string
  mode: "summary" | "question" | "improve" | "quiz"
}) {
  const instructions = {
    summary:
      "Сделай краткое и точное резюме статьи. Выдели ключевые действия и правила. Не добавляй сведения, которых нет в статье.",
    question:
      "Ответь на вопрос пользователя строго по содержимому статьи. Если статья не содержит ответа, прямо скажи об этом.",
    improve:
      "Предложи конкретные улучшения структуры и ясности статьи. Не меняй факты и не добавляй неподтверждённую информацию.",
    quiz:
      "Создай 5 проверочных вопросов по статье и сразу дай краткие правильные ответы.",
  }[mode]

  const prompt = `
Ты — LEGION Intelligence, помощник внутренней базы знаний LegionHunt.

${instructions}

Название статьи: ${article.title}
Категория: ${article.category}
Описание: ${article.excerpt}

СОДЕРЖИМОЕ СТАТЬИ:
${article.content}

ЗАПРОС:
${question || "Выполни выбранное действие."}

Отвечай на русском языке. Используй понятное форматирование Markdown.
`.trim()

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 3000,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    },
  )

  const payload = (await response.json()) as GeminiPayload

  if (!response.ok) {
    throw new Error(
      payload.error?.message || `Gemini API вернул HTTP ${response.status}.`,
    )
  }

  const answer =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? ""

  if (!answer) {
    throw new Error("Gemini не вернул ответ.")
  }

  return answer
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const articleId = Number(id)

    const result = await db.query<MessageRow>(
      `
        SELECT id::text, role, content, created_at::text
        FROM legionhunt_wiki_ai_messages
        WHERE article_id = $1
        ORDER BY created_at ASC, id ASC
        LIMIT 50
      `,
      [articleId],
    )

    return NextResponse.json({
      messages: result.rows.map(serializeMessage),
    })
  } catch (error) {
    console.error("Wiki AI history error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить историю AI." },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureCrmSchema()

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"

    if (!apiKey) {
      return NextResponse.json(
        { error: "На сервере не настроен GEMINI_API_KEY." },
        { status: 500 },
      )
    }

    const { id } = await context.params
    const articleId = Number(id)

    if (!Number.isSafeInteger(articleId) || articleId <= 0) {
      return NextResponse.json({ error: "Некорректный ID." }, { status: 400 })
    }

    const body = (await request.json()) as {
      question?: string
      mode?: "summary" | "question" | "improve" | "quiz"
    }

    const mode = body.mode ?? "question"
    const question = body.question?.trim() ?? ""

    if (mode === "question" && !question) {
      return NextResponse.json(
        { error: "Введите вопрос." },
        { status: 400 },
      )
    }

    const articleResult = await db.query<ArticleRow>(
      `
        SELECT title, category, excerpt, content
        FROM legionhunt_wiki_articles
        WHERE id = $1
      `,
      [articleId],
    )

    const article = articleResult.rows[0]

    if (!article) {
      return NextResponse.json(
        { error: "Статья не найдена." },
        { status: 404 },
      )
    }

    const userText =
      mode === "summary"
        ? "Сделай краткое содержание статьи."
        : mode === "improve"
          ? "Предложи улучшения статьи."
          : mode === "quiz"
            ? "Создай проверочный тест по статье."
            : question

    await db.query(
      `
        INSERT INTO legionhunt_wiki_ai_messages
          (article_id, role, content, created_by)
        VALUES ($1, 'user', $2, 'VSIPEK')
      `,
      [articleId, userText],
    )

    const answer = await askGemini({
      apiKey,
      model,
      article,
      question: userText,
      mode,
    })

    const inserted = await db.query<MessageRow>(
      `
        INSERT INTO legionhunt_wiki_ai_messages
          (article_id, role, content, created_by)
        VALUES ($1, 'assistant', $2, 'LEGION AI')
        RETURNING id::text, role, content, created_at::text
      `,
      [articleId, answer],
    )

    return NextResponse.json({
      message: serializeMessage(inserted.rows[0]),
    })
  } catch (error) {
    console.error("Wiki AI POST error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось получить ответ AI.",
      },
      { status: 500 },
    )
  }
}
