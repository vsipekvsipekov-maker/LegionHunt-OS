import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export const runtime = "nodejs"
export const maxDuration = 60

type GeminiPayload = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } }

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const body = await request.json() as { lessonId?: number; question?: string; user?: string }
    const lessonId = Number(body.lessonId)
    const question = body.question?.trim().slice(0, 1800)
    if (!Number.isSafeInteger(lessonId) || !question) return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 })

    const lessonResult = await db.query(`SELECT l.title,l.summary,l.content,c.title AS course_title,m.title AS module_title FROM legionhunt_academy_lessons l JOIN legionhunt_academy_modules m ON m.id=l.module_id JOIN legionhunt_academy_courses c ON c.id=m.course_id WHERE l.id=$1`, [lessonId])
    const lesson = lessonResult.rows[0]
    if (!lesson) return NextResponse.json({ error: "Урок не найден." }, { status: 404 })

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({ answer: `Кратко по уроку «${lesson.title}»: ${lesson.summary || "изучи основной материал и отметь ключевые действия в заметках."}\n\nВопрос: ${question}\n\nДля развёрнутого ответа добавьте GEMINI_API_KEY.` })
    }

    const prompt = `Ты — AI Mentor LegionHunt Academy. Отвечай только по материалу текущего урока, кратко, понятно и практично. Если вопрос выходит за пределы урока — скажи об этом.\n\nКурс: ${lesson.course_title}\nМодуль: ${lesson.module_title}\nУрок: ${lesson.title}\nКраткое описание: ${lesson.summary || ""}\nМатериал:\n${String(lesson.content || "").slice(0, 12000)}\n\nВопрос ученика: ${question}`
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1200 } }),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    })
    const payload = await response.json() as GeminiPayload
    if (!response.ok) throw new Error(payload.error?.message || `Gemini HTTP ${response.status}`)
    const answer = payload.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("\n").trim()
    return NextResponse.json({ answer: answer || "Не удалось сформировать ответ." })
  } catch (error) {
    console.error("Academy mentor error:", error)
    return NextResponse.json({ error: "AI Mentor временно недоступен." }, { status: 500 })
  }
}
