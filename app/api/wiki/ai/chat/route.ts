import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"
import { runAgentPipeline } from "@/lib/ai-agents/manager"
import type { KnowledgeSource as SourceRow } from "@/lib/ai-agents/types"

export const runtime = "nodejs"
export const maxDuration = 60

type GeminiPayload = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  error?: { message?: string }
}

type MemoryMessage = {
  role: "user" | "assistant"
  content: string
}

const MEMORY_MESSAGE_LIMIT = 14
const MEMORY_CHAR_LIMIT = 12_000

function buildConversationMemory(messages: MemoryMessage[]) {
  let used = 0
  const selected: MemoryMessage[] = []

  for (const message of [...messages].reverse()) {
    const content = message.content.trim().slice(0, 3000)
    if (!content) continue

    const cost = content.length + 40
    if (selected.length > 0 && used + cost > MEMORY_CHAR_LIMIT) break

    selected.push({ role: message.role, content })
    used += cost
  }

  return selected
    .reverse()
    .map((message) => `${message.role === "user" ? "Пользователь" : "LEGION AI"}: ${message.content}`)
    .join("\n\n")
}

function serializeSource(source: SourceRow) {
  return {
    id: Number(source.id),
    kind: source.kind,
    title: source.title,
    category: source.category,
    excerpt: source.content.slice(0, 420),
    score: Number(source.score),
  }
}

function buildFallbackAnswer(sources: SourceRow[], reason?: string) {
  const preview = sources
    .slice(0, 3)
    .map(
      (source, index) =>
        `${index + 1}. «${source.title}» (${source.category})\n${source.content.slice(0, 700)}`,
    )
    .join("\n\n")

  const notice = reason
    ? "AI-сервис временно недоступен, поэтому показана выдержка из найденных материалов."
    : "Для полноценного AI-ответа добавьте GEMINI_API_KEY в .env.local."

  return `${notice}\n\n${preview}`
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema()

    const body = (await request.json()) as {
      question?: string
      sessionId?: number | null
      user?: string
    }

    const question = body.question?.trim().slice(0, 2000)
    const user = body.user?.trim().slice(0, 160) || "VSIPEK"

    if (!question) {
      return NextResponse.json({ error: "Введите вопрос." }, { status: 400 })
    }

    let sessionId = body.sessionId ? Number(body.sessionId) : null

    if (sessionId && (!Number.isSafeInteger(sessionId) || sessionId <= 0)) {
      return NextResponse.json({ error: "Некорректная AI-сессия." }, { status: 400 })
    }

    if (sessionId) {
      const existing = await db.query(
        `SELECT 1 FROM legionhunt_ai_sessions WHERE id=$1 AND user_name=$2`,
        [sessionId, user],
      )

      if (!existing.rowCount) {
        return NextResponse.json({ error: "AI-сессия не найдена." }, { status: 404 })
      }
    } else {
      const session = await db.query<{ id: string }>(
        `INSERT INTO legionhunt_ai_sessions(user_name,title)
         VALUES($1,$2) RETURNING id::text`,
        [user, question.slice(0, 180)],
      )
      sessionId = Number(session.rows[0].id)
    }

    await db.query(
      `INSERT INTO legionhunt_ai_messages(session_id,role,content)
       VALUES($1,'user',$2)`,
      [sessionId, question],
    )

    const memoryResult = await db.query<MemoryMessage>(
      `SELECT role,content
       FROM legionhunt_ai_messages
       WHERE session_id=$1
       ORDER BY created_at DESC,id DESC
       LIMIT $2`,
      [sessionId, MEMORY_MESSAGE_LIMIT],
    )

    const memoryMessages = [...memoryResult.rows].reverse()
    const conversationMemory = buildConversationMemory(memoryMessages)
    const recentUserContext = memoryMessages
      .filter((message) => message.role === "user")
      .slice(-3)
      .map((message) => message.content)
      .join(" ")
      .slice(0, 4000)

    const pipeline = await runAgentPipeline({
      question,
      retrievalQuery: recentUserContext || question,
      user,
      sessionId: Number(sessionId),
    })
    const sources = pipeline.sources
    const serializedSources = sources.map(serializeSource)
    const serializedRecommendations = pipeline.recommendations.map(serializeSource)
    let answer = ""
    const learningQueueId = pipeline.learningQueueId

    if (!sources.length) {
      answer =
        "В текущей базе знаний не найдено достаточно информации для уверенного ответа. Вопрос добавлен в очередь обучения AI — администратор сможет добавить правильный ответ в базу знаний."
    } else {
      const apiKey = process.env.GEMINI_API_KEY?.trim()
      const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"

      if (apiKey) {
        const context = sources
          .map(
            (source, index) => `
[ИСТОЧНИК ${index + 1}]
Тип: ${source.kind}
Название: ${source.title}
Категория: ${source.category}
Содержание:
${source.content.slice(0, 5000)}
`.trim(),
          )
          .join("\n\n")

        const prompt = `
Ты — LEGION AI Knowledge.
Продолжай текущий диалог и учитывай историю разговора.
Отвечай только на основе предоставленных источников.
Не придумывай факты. Если данных недостаточно — прямо скажи об этом.
Если пользователь пишет «это», «там», «тот регламент» или другой короткий уточняющий вопрос, восстанови смысл из истории.
Ответ дай на русском, практично и структурированно.
В конце укажи номера использованных источников.

Рекомендация Mentor Agent по стилю ответа:
${pipeline.mentor.responseStyle}

Подсказка Memory Agent:
${pipeline.memory.contextHint}

История текущего диалога:
${conversationMemory || "История отсутствует."}

Текущий вопрос:
${question}

Источники:
${context}

Связанные материалы, которые можно кратко рекомендовать в конце ответа:
${pipeline.recommendations.map((item, index) => `${index + 1}. ${item.title} (${item.category})`).join("\n") || "Нет дополнительных рекомендаций."}
`.trim()

        try {
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
                generationConfig: { temperature: 0.15, maxOutputTokens: 1800 },
              }),
              signal: AbortSignal.timeout(50_000),
              cache: "no-store",
            },
          )

          const payload = (await response.json()) as GeminiPayload
          if (!response.ok) {
            throw new Error(payload.error?.message || `Gemini HTTP ${response.status}`)
          }

          answer =
            payload.candidates?.[0]?.content?.parts
              ?.map((part) => part.text ?? "")
              .join("\n")
              .trim() ?? ""

          if (!answer) throw new Error("Gemini returned an empty answer")
        } catch (geminiError) {
          console.error("Gemini fallback:", geminiError)
          answer = buildFallbackAnswer(sources, "gemini_unavailable")
        }
      } else {
        answer = buildFallbackAnswer(sources)
      }
    }

    await db.query(
      `INSERT INTO legionhunt_ai_messages(session_id,role,content,sources)
       VALUES($1,'assistant',$2,$3::jsonb)`,
      [sessionId, answer, JSON.stringify(serializedSources)],
    )

    await db.query(
      `UPDATE legionhunt_ai_sessions SET updated_at=NOW() WHERE id=$1 AND user_name=$2`,
      [sessionId, user],
    )

    return NextResponse.json({
      sessionId,
      answer,
      sources: serializedSources,
      recommendations: serializedRecommendations,
      learningQueueId,
      agents: pipeline.agents,
      audience: pipeline.mentor.audience,
    })
  } catch (error) {
    console.error("AI Knowledge chat error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось получить ответ AI." },
      { status: 500 },
    )
  }
}
