import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type CaseRow = {
  id: string
  title: string
  category: string
  status: "success" | "in_progress" | "failed" | "archived"
  situation: string
  problem: string
  solution: string
  result: string
  lessons: string
  owner: string
  tags: string[]
  created_at: string
  updated_at: string
}

function serialize(row: CaseRow) {
  return {
    id: Number(row.id),
    title: row.title,
    category: row.category,
    status: row.status,
    situation: row.situation,
    problem: row.problem,
    solution: row.solution,
    result: row.result,
    lessons: row.lessons,
    owner: row.owner,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function seedCases() {
  if (process.env.WIKI_AUTO_SEED !== "true") return

  const count = await db.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM legionhunt_wiki_cases",
  )

  if (Number(count.rows[0]?.count ?? 0) > 0) return

  await db.query(`
    INSERT INTO legionhunt_wiki_cases
      (title, category, status, situation, problem, solution, result, lessons, owner, tags)
    VALUES
      (
        'Кандидат без опыта дошёл до обучения',
        'Рекрутинг',
        'success',
        'Кандидат заинтересовался работой, но переживал из-за отсутствия опыта.',
        'Он несколько раз откладывал созвон и сомневался, что справится.',
        'Менеджер сократил первое сообщение, показал понятный план обучения и назначил короткий созвон на 15 минут.',
        'Кандидат прошёл созвон и был переведён на этап обучения.',
        'Не перегружать новичка информацией. Сначала снять главный страх и предложить один простой следующий шаг.',
        'VSIPEK',
        ARRAY['CRM','Обучение','Возражения']
      ),
      (
        'Возврат кандидата после трёх дней тишины',
        'CRM',
        'success',
        'Кандидат перестал отвечать после первого контакта.',
        'Повторные длинные сообщения не давали результата.',
        'Менеджер отправил короткое сообщение с выбором из двух вариантов времени.',
        'Кандидат ответил и согласился на созвон.',
        'После паузы лучше давать простой выбор, а не повторять презентацию.',
        'MENTOR',
        ARRAY['Follow-up','CRM','Созвон']
      ),
      (
        'Сложное возражение по доходу',
        'Продажи',
        'in_progress',
        'Кандидат ожидал гарантированный фиксированный доход.',
        'Он не понимал модель роста и задавал много вопросов о рисках.',
        'Команда подготовила прозрачный расчёт, примеры и план первых четырёх недель.',
        'Кандидат изучает предложение. Следующий контакт назначен.',
        'Нельзя обещать неподтверждённый результат. Лучше показывать сценарии и конкретные шаги.',
        'VSIPEK',
        ARRAY['Продажи','Доход','Скрипт']
      )
  `)
}

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()
    await seedCases()

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? ""
    const status = request.nextUrl.searchParams.get("status")?.trim() ?? ""
    const category = request.nextUrl.searchParams.get("category")?.trim() ?? ""

    const values: string[] = []
    const where: string[] = []

    if (query) {
      values.push(`%${query}%`)
      where.push(
        `(title ILIKE $${values.length} OR situation ILIKE $${values.length} OR problem ILIKE $${values.length} OR solution ILIKE $${values.length} OR result ILIKE $${values.length})`,
      )
    }

    if (status && status !== "all") {
      values.push(status)
      where.push(`status = $${values.length}`)
    }

    if (category && category !== "all") {
      values.push(category)
      where.push(`category = $${values.length}`)
    }

    const result = await db.query<CaseRow>(
      `
        SELECT
          id::text,
          title,
          category,
          status,
          situation,
          problem,
          solution,
          result,
          lessons,
          owner,
          tags,
          created_at::text,
          updated_at::text
        FROM legionhunt_wiki_cases
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, id DESC
      `,
      values,
    )

    return NextResponse.json({
      cases: result.rows.map(serialize),
    })
  } catch (error) {
    console.error("Cases GET error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить кейсы." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema()

    const body = (await request.json()) as {
      title?: string
      category?: string
      status?: "success" | "in_progress" | "failed" | "archived"
      situation?: string
      problem?: string
      solution?: string
      result?: string
      lessons?: string
      owner?: string
      tags?: string[]
    }

    const title = body.title?.trim()

    if (!title) {
      return NextResponse.json(
        { error: "Название кейса обязательно." },
        { status: 400 },
      )
    }

    const result = await db.query<CaseRow>(
      `
        INSERT INTO legionhunt_wiki_cases
          (title, category, status, situation, problem, solution, result, lessons, owner, tags)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING
          id::text,
          title,
          category,
          status,
          situation,
          problem,
          solution,
          result,
          lessons,
          owner,
          tags,
          created_at::text,
          updated_at::text
      `,
      [
        title,
        body.category?.trim() || "Продажи",
        body.status || "success",
        body.situation?.trim() || "",
        body.problem?.trim() || "",
        body.solution?.trim() || "",
        body.result?.trim() || "",
        body.lessons?.trim() || "",
        body.owner?.trim() || "VSIPEK",
        body.tags ?? [],
      ],
    )

    return NextResponse.json(
      { case: serialize(result.rows[0]) },
      { status: 201 },
    )
  } catch (error) {
    console.error("Cases POST error:", error)
    return NextResponse.json(
      { error: "Не удалось создать кейс." },
      { status: 500 },
    )
  }
}
