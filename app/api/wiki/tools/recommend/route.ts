import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export const runtime = "nodejs"
export const maxDuration = 60

type GeminiPayload = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  error?: { message?: string }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const body = (await request.json()) as { question?: string }
    const question = body.question?.trim()

    if (!question) {
      return NextResponse.json({ error: "Опиши задачу." }, { status: 400 })
    }

    const tools = await db.query<{
      id: string
      name: string
      category: string
      description: string
      launch_url: string
      tags: string[]
    }>(
      `SELECT id::text,name,category,description,launch_url,tags
       FROM legionhunt_wiki_tools
       WHERE status <> 'archived'
       ORDER BY name`,
    )

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"

    if (!apiKey) {
      const query = question.toLowerCase()
      const ranked = tools.rows
        .map((tool) => ({
          tool,
          score: [tool.name, tool.category, tool.description, ...(tool.tags ?? [])]
            .join(" ")
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word.length > 2 && query.includes(word))
            .length,
        }))
        .sort((a, b) => b.score - a.score)

      const best = ranked[0]?.tool
      return NextResponse.json({
        answer: best
          ? `Подходящий инструмент: ${best.name}. ${best.description}`
          : "Не удалось подобрать инструмент.",
        toolId: best ? Number(best.id) : null,
      })
    }

    const catalog = tools.rows
      .map(
        (tool) =>
          `ID ${tool.id}: ${tool.name} | ${tool.category} | ${tool.description} | теги: ${(tool.tags ?? []).join(", ")}`,
      )
      .join("\n")

    const prompt = `
Ты — LEGION Intelligence. Выбери ОДИН наиболее подходящий инструмент из каталога.
Не придумывай инструменты. Ответь кратко на русском.
Первая строка строго: TOOL_ID=<число>
Далее объясни выбор и дай короткий следующий шаг.

Задача пользователя:
${question}

Каталог:
${catalog}
`.trim()

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.15, maxOutputTokens: 800 },
        }),
        signal: AbortSignal.timeout(55000),
        cache: "no-store",
      },
    )

    const payload = (await response.json()) as GeminiPayload
    if (!response.ok) {
      throw new Error(payload.error?.message || `Gemini HTTP ${response.status}`)
    }

    const answer =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("\n")
        .trim() ?? ""

    const match = answer.match(/TOOL_ID=(\d+)/)
    return NextResponse.json({
      answer: answer.replace(/^TOOL_ID=\d+\s*/i, "").trim(),
      toolId: match ? Number(match[1]) : null,
    })
  } catch (error) {
    console.error("Tool recommend error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось подобрать инструмент.",
      },
      { status: 500 },
    )
  }
}
