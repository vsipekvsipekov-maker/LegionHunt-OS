import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type RegulationRow = {
  id: string
  title: string
  category: string
  status: "draft" | "active" | "archived"
  owner: string
  summary: string
  content: string
  steps: Array<{ title: string; description: string }>
  version_number: number
  tags: string[]
  created_at: string
  updated_at: string
}

function serialize(row: RegulationRow) {
  return {
    id: Number(row.id),
    title: row.title,
    category: row.category,
    status: row.status,
    owner: row.owner,
    summary: row.summary,
    content: row.content,
    steps: row.steps ?? [],
    versionNumber: row.version_number,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function seedRegulations() {
  if (process.env.WIKI_AUTO_SEED !== "true") return

  const count = await db.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM legionhunt_wiki_regulations",
  )

  if (Number(count.rows[0]?.count ?? 0) > 0) return

  await db.query(`
    INSERT INTO legionhunt_wiki_regulations
      (title, category, status, owner, summary, content, steps, version_number, tags)
    VALUES
      (
        'Регламент первого контакта с кандидатом',
        'CRM',
        'active',
        'VSIPEK',
        'Порядок первого сообщения, проверки ответа и назначения созвона.',
        'Используйте короткий и понятный первый контакт. Не перегружайте кандидата деталями.',
        '[{"title":"Проверить профиль","description":"Убедиться, что контакт и источник указаны верно."},{"title":"Отправить первое сообщение","description":"Использовать актуальный шаблон и персонализировать обращение."},{"title":"Зафиксировать ответ","description":"Обновить статус кандидата в CRM."},{"title":"Назначить следующий шаг","description":"Созвон, повторный контакт или закрытие карточки."}]'::jsonb,
        3,
        ARRAY['CRM','Кандидаты','Первый контакт']
      ),
      (
        'Регламент обучения новичка',
        'Academy',
        'active',
        'MENTOR',
        'Пошаговый процесс запуска нового сотрудника в обучение.',
        'Наставник отвечает за последовательность модулей, проверку материалов и обратную связь.',
        '[{"title":"Добавить в Academy","description":"Назначить стартовый курс."},{"title":"Проверить первый модуль","description":"Убедиться, что урок пройден."},{"title":"Назначить практику","description":"Дать первое практическое задание."},{"title":"Провести проверку","description":"Зафиксировать результат и следующий этап."}]'::jsonb,
        2,
        ARRAY['Academy','Наставничество','Обучение']
      ),
      (
        'Регламент выплат',
        'Finance',
        'draft',
        'VSIPEK',
        'Порядок проверки начислений и подготовки выплаты.',
        'Черновая версия. Требуется подтверждение финального процесса.',
        '[{"title":"Собрать начисления","description":"Проверить данные за период."},{"title":"Сверить исключения","description":"Учесть бонусы, штрафы и корректировки."},{"title":"Подтвердить итог","description":"Передать сумму на финальное согласование."}]'::jsonb,
        1,
        ARRAY['Finance','Выплаты']
      )
  `)
}

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()
    await seedRegulations()

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
    const status = request.nextUrl.searchParams.get("status")?.trim() ?? ""
    const category = request.nextUrl.searchParams.get("category")?.trim() ?? ""

    const values: string[] = []
    const where: string[] = []

    if (q) {
      values.push(`%${q}%`)
      where.push(
        `(title ILIKE $${values.length} OR summary ILIKE $${values.length} OR content ILIKE $${values.length})`,
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

    const result = await db.query<RegulationRow>(
      `
        SELECT
          id::text,
          title,
          category,
          status,
          owner,
          summary,
          content,
          steps,
          version_number,
          tags,
          created_at::text,
          updated_at::text
        FROM legionhunt_wiki_regulations
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, id DESC
      `,
      values,
    )

    return NextResponse.json({
      regulations: result.rows.map(serialize),
    })
  } catch (error) {
    console.error("Regulations GET error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить регламенты." },
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
      status?: "draft" | "active" | "archived"
      owner?: string
      summary?: string
      content?: string
      steps?: Array<{ title: string; description: string }>
      tags?: string[]
    }

    const title = body.title?.trim()
    if (!title) {
      return NextResponse.json(
        { error: "Название регламента обязательно." },
        { status: 400 },
      )
    }

    const result = await db.query<RegulationRow>(
      `
        INSERT INTO legionhunt_wiki_regulations
          (title, category, status, owner, summary, content, steps, tags)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
        RETURNING
          id::text,
          title,
          category,
          status,
          owner,
          summary,
          content,
          steps,
          version_number,
          tags,
          created_at::text,
          updated_at::text
      `,
      [
        title,
        body.category?.trim() || "Общее",
        body.status || "active",
        body.owner?.trim() || "VSIPEK",
        body.summary?.trim() || "",
        body.content?.trim() || "",
        JSON.stringify(body.steps ?? []),
        body.tags ?? [],
      ],
    )

    return NextResponse.json(
      { regulation: serialize(result.rows[0]) },
      { status: 201 },
    )
  } catch (error) {
    console.error("Regulations POST error:", error)
    return NextResponse.json(
      { error: "Не удалось создать регламент." },
      { status: 500 },
    )
  }
}
