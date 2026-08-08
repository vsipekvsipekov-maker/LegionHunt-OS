import { NextRequest, NextResponse } from "next/server"

import { db, ensureCrmSchema } from "@/lib/db"

export const runtime = "nodejs"
export const maxDuration = 60

type ArticleRow = {
  id: string
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

type OpenAIResponse = {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
  error?: {
    message?: string
  }
}

type AiMode = "summary" | "question" | "improve" | "quiz"

async function ensureWikiAiSchema() {
  await ensureCrmSchema()

  await db.query(`
    CREATE TABLE IF NOT EXISTS legionhunt_wiki_article_ai_messages (
      id BIGSERIAL PRIMARY KEY,
      article_id BIGINT NOT NULL
        REFERENCES legionhunt_wiki_articles(id)
        ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL
        CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_article_ai_messages_article_idx
      ON legionhunt_wiki_article_ai_messages(article_id, created_at);
  `)
}

function mapMessage(row: MessageRow) {
  return {
    id: Number(row.id),
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }
}

function extractText(payload: OpenAIResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim()
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .filter((part) => part.type === "output_text")
      .map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? ""
  )
}

function instructionForMode(mode: AiMode, question: string) {
  if (mode === "summary") {
    return "Сделай краткое и полезное содержание этой статьи. Выдели главные правила и выводы."
  }

  if (mode === "improve") {
    return "Предложи конкретные улучшения этой статьи: что уточнить, убрать, структурировать или добавить. Не добавляй факты, которых нет в статье."
  }

  if (mode === "quiz") {
    return "Создай проверочный тест по статье: 5 вопросов, по 4 варианта ответа и правильный ответ после каждого вопроса."
  }

  return question
}

async function callOpenAI({
  apiKey,
  model,
  article,
  requestText,
  history,
}: {
  apiKey: string
  model: string
  article: ArticleRow
  requestText: string
  history: MessageRow[]
}) {
  const instructions = `
Ты — LEGION Intelligence внутри Wiki платформы LegionHunt.

Отвечай только по текущей статье.
Не выдумывай факты, которых в статье нет.
Если вопрос не раскрывается в статье — прямо скажи об этом.
Отвечай на русском языке, ясно и по делу.
`.trim()

  const articleContext = `
ТЕКУЩАЯ СТАТЬЯ

Название: ${article.title}
Категория: ${article.category}
Описание: ${article.excerpt}

Содержание:
${article.content.slice(0, 90_000)}
`.trim()

  const input = [
    {
      role: "user" as const,
      content: [{ type: "input_text" as const, text: articleContext }],
    },
    ...history.slice(-8).map((message) => ({
      role: message.role,
      content: [
        {
          type: "input_text" as const,
          text: message.content.slice(0, 6000),
        },
      ],
    })),
    {
      role: "user" as const,
      content: [
        {
          type: "input_text" as const,
          text: requestText.slice(0, 8000),
        },
      ],
    },
  ]

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      max_output_tokens: 1600,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(50_000),
  })

  const raw = await response.text()
  let payload: OpenAIResponse

  try {
    payload = JSON.parse(raw) as OpenAIResponse
  } catch {
    throw new Error(
      raw.trim().slice(0, 500) ||
        `OpenAI вернул некорректный ответ HTTP ${response.status}.`,
    )
  }

  if (!response.ok) {
    throw new Error(
      payload.error?.message || `OpenAI API HTTP ${response.status}.`,
    )
  }

  const answer = extractText(payload)

  if (!answer) {
    throw new Error("OpenAI не вернул текстовый ответ.")
  }

  return answer
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureWikiAiSchema()

    const { id } = await context.params
    const articleId = Number(id)

    if (!Number.isInteger(articleId) || articleId <= 0) {
      return NextResponse.json(
        { error: "Некорректный идентификатор статьи." },
        { status: 400 },
      )
    }

    const result = await db.query<MessageRow>(
      `
        SELECT id::text, role, content, created_at::text
        FROM legionhunt_wiki_article_ai_messages
        WHERE article_id = $1
        ORDER BY created_at ASC, id ASC
        LIMIT 100
      `,
      [articleId],
    )

    return NextResponse.json({
      messages: result.rows.map(mapMessage),
    })
  } catch (error) {
    console.error("Wiki article AI GET error:", error)

    return NextResponse.json(
      { error: "Не удалось загрузить историю LEGION AI." },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureWikiAiSchema()

    const apiKey = process.env.OPENAI_API_KEY?.trim()
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini"

    if (!apiKey) {
      return NextResponse.json(
        { error: "На сервере не настроен OPENAI_API_KEY." },
        { status: 500 },
      )
    }

    const { id } = await context.params
    const articleId = Number(id)

    if (!Number.isInteger(articleId) || articleId <= 0) {
      return NextResponse.json(
        { error: "Некорректный идентификатор статьи." },
        { status: 400 },
      )
    }

    const body = (await request.json()) as {
      mode?: AiMode
      question?: string
    }

    const mode: AiMode =
      body.mode === "summary" ||
      body.mode === "question" ||
      body.mode === "improve" ||
      body.mode === "quiz"
        ? body.mode
        : "question"

    const question = body.question?.trim() ?? ""

    if (mode === "question" && !question) {
      return NextResponse.json(
        { error: "Введите вопрос по статье." },
        { status: 400 },
      )
    }

    const articleResult = await db.query<ArticleRow>(
      `
        SELECT id::text, title, category, excerpt, content
        FROM legionhunt_wiki_articles
        WHERE id = $1
        LIMIT 1
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

    const historyResult = await db.query<MessageRow>(
      `
        SELECT id::text, role, content, created_at::text
        FROM legionhunt_wiki_article_ai_messages
        WHERE article_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 8
      `,
      [articleId],
    )

    const history = [...historyResult.rows].reverse()
    const requestText = instructionForMode(mode, question)

    await db.query(
      `
        INSERT INTO legionhunt_wiki_article_ai_messages
          (article_id, role, content)
        VALUES ($1, 'user', $2)
      `,
      [articleId, requestText],
    )

    const answer = await callOpenAI({
      apiKey,
      model,
      article,
      requestText,
      history,
    })

    const inserted = await db.query<MessageRow>(
      `
        INSERT INTO legionhunt_wiki_article_ai_messages
          (article_id, role, content)
        VALUES ($1, 'assistant', $2)
        RETURNING id::text, role, content, created_at::text
      `,
      [articleId, answer],
    )

    return NextResponse.json({
      message: mapMessage(inserted.rows[0]),
      model,
      provider: "openai",
    })
  } catch (error) {
    console.error("Wiki article AI POST error:", error)

    const message =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? "OpenAI не ответил вовремя. Повтори запрос."
          : error.message
        : "Ошибка LEGION AI."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
