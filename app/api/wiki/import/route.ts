import { NextRequest, NextResponse } from "next/server"
import mammoth from "mammoth"

import { db, ensureCrmSchema } from "@/lib/db"

export const runtime = "nodejs"
export const maxDuration = 300

type GeneratedArticle = {
  title: string
  category: string
  excerpt: string
  content: string
}

type OpenAIFileResponse = {
  id?: string
  error?: { message?: string }
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
  error?: { message?: string }
}

const MAX_FILE_BYTES = 12 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md", "markdown"])

function extensionOf(filename: string) {
  const parts = filename.toLowerCase().split(".")
  return parts.length > 1 ? parts.pop() ?? "" : ""
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180)
}

function extractJson(text: string): GeneratedArticle[] {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  const firstBracket = cleaned.indexOf("[")
  const lastBracket = cleaned.lastIndexOf("]")

  if (firstBracket < 0 || lastBracket < firstBracket) {
    throw new Error("AI не вернул список статей.")
  }

  const parsed = JSON.parse(cleaned.slice(firstBracket, lastBracket + 1)) as unknown

  if (!Array.isArray(parsed)) {
    throw new Error("Некорректный формат результата AI.")
  }

  return parsed
    .filter((item): item is GeneratedArticle => {
      if (!item || typeof item !== "object") return false
      const record = item as Record<string, unknown>
      return (
        typeof record.title === "string" &&
        typeof record.category === "string" &&
        typeof record.excerpt === "string" &&
        typeof record.content === "string"
      )
    })
    .slice(0, 10)
}

function readOpenAIText(payload: OpenAIResponse) {
  if (typeof payload.output_text === "string") {
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

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const raw = await response.text()
  let payload: T

  try {
    payload = JSON.parse(raw) as T
  } catch {
    throw new Error(raw.trim().slice(0, 500) || `${fallbackMessage} HTTP ${response.status}.`)
  }

  if (!response.ok) {
    const record = payload as { error?: { message?: string } }
    throw new Error(record.error?.message || `${fallbackMessage} HTTP ${response.status}.`)
  }

  return payload
}

async function createOpenAIResponse({
  apiKey,
  model,
  content,
}: {
  apiKey: string
  model: string
  content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_file"; file_id: string }
  >
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content }],
      max_output_tokens: 8_000,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(240_000),
  })

  const payload = await readJsonResponse<OpenAIResponse>(
    response,
    "OpenAI API вернул ошибку.",
  )

  const answer = readOpenAIText(payload)
  if (!answer) throw new Error("OpenAI не вернул текстовый результат.")

  return extractJson(answer)
}

function articlePrompt(filename: string) {
  return `
Ты создаёшь внутреннюю базу знаний LEGION Wiki.

Преобразуй документ "${filename}" в 1–10 самостоятельных статей.

Правила:
- используй только сведения из документа;
- не добавляй выдуманные факты;
- сохраняй терминологию, инструкции и правила;
- разделяй материал логически;
- каждая статья должна быть понятна отдельно;
- content оформляй в Markdown;
- верни только JSON-массив без пояснений и Markdown-обёртки.

Формат:
[
  {
    "title": "Название статьи",
    "category": "Короткая категория",
    "excerpt": "Описание в 1–2 предложениях",
    "content": "# Заголовок\\n\\nТекст статьи в Markdown"
  }
]
`.trim()
}

async function generateFromText(
  text: string,
  filename: string,
  apiKey: string,
  model: string,
) {
  return createOpenAIResponse({
    apiKey,
    model,
    content: [
      {
        type: "input_text",
        text: `${articlePrompt(filename)}\n\nДокумент:\n${text.slice(0, 120_000)}`,
      },
    ],
  })
}

async function uploadOpenAIFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  apiKey: string,
) {
  const formData = new FormData()
  formData.set("purpose", "user_data")

  const fileBytes = new Uint8Array(buffer)

  formData.set(
    "file",
    new File([fileBytes], filename, {
      type: mimeType,
    }),
  )

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  })

  const payload = await readJsonResponse<OpenAIFileResponse>(
    response,
    "Не удалось загрузить PDF в OpenAI.",
  )

  if (!payload.id) {
    throw new Error("OpenAI не вернул идентификатор загруженного файла.")
  }

  return payload.id
}

async function deleteOpenAIFile(fileId: string, apiKey: string) {
  try {
    await fetch(`https://api.openai.com/v1/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    })
  } catch (error) {
    console.error("OpenAI temporary file cleanup error:", error)
  }
}

async function generateFromPdf(
  buffer: Buffer,
  filename: string,
  apiKey: string,
  model: string,
) {
  const fileId = await uploadOpenAIFile(buffer, filename, "application/pdf", apiKey)

  try {
    return await createOpenAIResponse({
      apiKey,
      model,
      content: [
        { type: "input_text", text: articlePrompt(filename) },
        { type: "input_file", file_id: fileId },
      ],
    })
  } finally {
    await deleteOpenAIFile(fileId, apiKey)
  }
}

async function insertArticles(articles: GeneratedArticle[], filename: string) {
  const inserted = []

  for (const article of articles) {
    const title = article.title.trim().slice(0, 220)
    if (!title || !article.content.trim()) continue

    const slug = `${slugify(title) || "imported-article"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

    const result = await db.query<{
      id: string
      title: string
      category: string
    }>(
      `
        INSERT INTO legionhunt_wiki_articles
          (title, slug, category, excerpt, content, author)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id::text, title, category
      `,
      [
        title,
        slug,
        article.category.trim().slice(0, 120) || "Импорт",
        article.excerpt.trim(),
        article.content.trim(),
        `AI Import · ${filename.slice(0, 100)}`,
      ],
    )

    inserted.push({
      id: Number(result.rows[0].id),
      title: result.rows[0].title,
      category: result.rows[0].category,
    })
  }

  return inserted
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema()

    const apiKey = process.env.OPENAI_API_KEY?.trim()
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini"

    if (!apiKey) {
      return NextResponse.json(
        { error: "На сервере не настроен OPENAI_API_KEY." },
        { status: 500 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не выбран." }, { status: 400 })
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Файл пустой." }, { status: 400 })
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Максимальный размер файла — 12 МБ." },
        { status: 413 },
      )
    }

    const extension = extensionOf(file.name)

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "Поддерживаются PDF, DOCX, TXT и Markdown." },
        { status: 415 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let articles: GeneratedArticle[]

    if (extension === "pdf") {
      articles = await generateFromPdf(buffer, file.name, apiKey, model)
    } else {
      let text = ""

      if (extension === "docx") {
        const extracted = await mammoth.extractRawText({ buffer })
        text = extracted.value
      } else {
        text = buffer.toString("utf8")
      }

      if (!text.trim()) {
        return NextResponse.json(
          { error: "Не удалось извлечь текст из документа." },
          { status: 422 },
        )
      }

      articles = await generateFromText(text, file.name, apiKey, model)
    }

    if (!articles.length) {
      return NextResponse.json(
        { error: "AI не смог сформировать статьи из документа." },
        { status: 422 },
      )
    }

    const inserted = await insertArticles(articles, file.name)

    return NextResponse.json({
      imported: inserted.length,
      articles: inserted,
      provider: "openai",
      model,
    })
  } catch (error) {
    console.error("Wiki OpenAI import error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось импортировать документ.",
      },
      { status: 500 },
    )
  }
}