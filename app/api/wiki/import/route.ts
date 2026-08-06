import { NextRequest, NextResponse } from "next/server"
import mammoth from "mammoth"

import { db, ensureCrmSchema } from "@/lib/db"

export const runtime = "nodejs"
export const maxDuration = 60

type GeneratedArticle = {
  title: string
  category: string
  excerpt: string
  content: string
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  error?: {
    message?: string
  }
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

  const parsed = JSON.parse(
    cleaned.slice(firstBracket, lastBracket + 1),
  ) as unknown

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

async function generateFromText(
  text: string,
  filename: string,
  apiKey: string,
  model: string,
) {
  const prompt = `
Ты создаёшь внутреннюю базу знаний LEGION Wiki.

Преобразуй документ "${filename}" в 1–10 самостоятельных статей.
Сохраняй факты, терминологию и правила исходного документа.
Не добавляй выдуманные сведения.
Разделяй материал логически: регламенты, инструкции, скрипты,
возражения, обучение, FAQ и другие естественные темы.

Верни ТОЛЬКО JSON-массив без Markdown-обёртки:
[
  {
    "title": "Название статьи",
    "category": "Короткая категория",
    "excerpt": "Описание в 1–2 предложениях",
    "content": "# Заголовок\\n\\nТекст статьи в Markdown"
  }
]

Документ:
${text.slice(0, 100_000)}
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
          maxOutputTokens: 8_000,
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    },
  )

  const payload = (await response.json()) as GeminiResponse

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `Gemini API вернул HTTP ${response.status}.`,
    )
  }

  const answer =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? ""

  return extractJson(answer)
}

async function generateFromPdf(
  buffer: Buffer,
  filename: string,
  apiKey: string,
  model: string,
) {
  const prompt = `
Преобразуй приложенный PDF "${filename}" в 1–10 статей для LEGION Wiki.

Правила:
- используй только сведения из PDF;
- не выдумывай отсутствующие детали;
- сохраняй терминологию документа;
- разделяй материал на логичные самостоятельные статьи;
- возвращай только JSON-массив.

Формат:
[
  {
    "title": "Название",
    "category": "Категория",
    "excerpt": "Краткое описание",
    "content": "# Заголовок\\n\\nСтатья в Markdown"
  }
]
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
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: buffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8_000,
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    },
  )

  const payload = (await response.json()) as GeminiResponse

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `Gemini API вернул HTTP ${response.status}.`,
    )
  }

  const answer =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? ""

  return extractJson(answer)
}

async function insertArticles(
  articles: GeneratedArticle[],
  filename: string,
) {
  const inserted = []

  for (const article of articles) {
    const title = article.title.trim().slice(0, 220)

    if (!title || !article.content.trim()) continue

    const slug = `${
      slugify(title) || "imported-article"
    }-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

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

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    const model =
      process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash"

    if (!apiKey) {
      return NextResponse.json(
        { error: "На сервере не настроен GEMINI_API_KEY." },
        { status: 500 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Файл не выбран." },
        { status: 400 },
      )
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "Файл пустой." },
        { status: 400 },
      )
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
      articles = await generateFromPdf(
        buffer,
        file.name,
        apiKey,
        model,
      )
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

      articles = await generateFromText(
        text,
        file.name,
        apiKey,
        model,
      )
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
    })
  } catch (error) {
    console.error("Wiki import error:", error)

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
