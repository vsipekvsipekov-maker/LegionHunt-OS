import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type ToolRow = {
  id: string
  name: string
  slug: string
  icon: string
  category: string
  status: "active" | "beta" | "archived"
  description: string
  instructions: string
  launch_url: string
  owner: string
  version: string
  tags: string[]
  requirements: string[]
  related_article_ids: string[]
  related_case_ids: string[]
  related_regulation_ids: string[]
  created_at: string
  updated_at: string
  is_favorite: boolean
  views: string
}

function serialize(row: ToolRow) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    category: row.category,
    status: row.status,
    description: row.description,
    instructions: row.instructions,
    launchUrl: row.launch_url,
    owner: row.owner,
    version: row.version,
    tags: row.tags ?? [],
    requirements: row.requirements ?? [],
    relatedArticleIds: (row.related_article_ids ?? []).map(Number),
    relatedCaseIds: (row.related_case_ids ?? []).map(Number),
    relatedRegulationIds: (row.related_regulation_ids ?? []).map(Number),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isFavorite: row.is_favorite,
    views: Number(row.views ?? 0),
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 170)
}

async function seedTools() {
  if (process.env.WIKI_AUTO_SEED !== "true") return

  const count = await db.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM legionhunt_wiki_tools",
  )
  if (Number(count.rows[0]?.count ?? 0) > 0) return

  await db.query(`
    INSERT INTO legionhunt_wiki_tools
      (
        name,
        slug,
        icon,
        category,
        status,
        description,
        instructions,
        launch_url,
        owner,
        version,
        tags,
        requirements
      )
    VALUES
      (
        'LEGION CRM',
        'legion-crm',
        '👥',
        'CRM',
        'active',
        'Работа с кандидатами, этапами воронки, задачами и напоминаниями.',
        'Открой CRM, выбери кандидата и зафиксируй следующий шаг. Используй комментарии, задачи и напоминания для контроля.',
        '/crm',
        'VSIPEK',
        '3.0',
        ARRAY['CRM','Кандидаты','Воронка'],
        ARRAY['Доступ к LegionHunt']
      ),
      (
        'LEGION Intelligence',
        'legion-intelligence',
        '🤖',
        'AI',
        'active',
        'AI-помощник для анализа, генерации сообщений и работы с базой знаний.',
        'Открой AI Center или используй вкладку AI внутри статьи Wiki. Проверяй факты перед отправкой результата.',
        '/ai',
        'VSIPEK',
        '2.5',
        ARRAY['AI','Gemini','Автоматизация'],
        ARRAY['GEMINI_API_KEY']
      ),
      (
        'Academy',
        'legion-academy',
        '🎓',
        'Academy',
        'active',
        'Курсы, уроки, тесты и прогресс сотрудников.',
        'Назначь сотруднику курс, отслеживай прогресс и проводи проверку после каждого модуля.',
        '/academy',
        'MENTOR',
        '1.0',
        ARRAY['Academy','Обучение'],
        ARRAY['Профиль сотрудника']
      ),
      (
        'Wiki Import',
        'wiki-import',
        '📄',
        'Utilities',
        'active',
        'Преобразование PDF, DOCX, TXT и Markdown в статьи базы знаний.',
        'Открой Wiki, нажми AI импорт, выбери документ до 12 МБ и дождись создания статей.',
        '/wiki',
        'VSIPEK',
        '1.1',
        ARRAY['PDF','DOCX','Wiki'],
        ARRAY['GEMINI_API_KEY','mammoth']
      ),
      (
        'Analytics',
        'legion-analytics',
        '📊',
        'Analytics',
        'beta',
        'Метрики, KPI и аналитика активности команды.',
        'Выбери период и сравни ключевые показатели. Используй фильтры по сотрудникам и направлениям.',
        '/analytics',
        'VSIPEK',
        '0.9-beta',
        ARRAY['Analytics','KPI'],
        ARRAY['Данные CRM']
      ),
      (
        'Finance',
        'legion-finance',
        '💰',
        'Finance',
        'beta',
        'Расчёт выплат, бонусов и финансовых отчётов.',
        'Проверь период, начисления, корректировки и итоговую сумму перед подтверждением выплаты.',
        '/finance',
        'VSIPEK',
        '0.9-beta',
        ARRAY['Finance','Выплаты'],
        ARRAY['Подтверждённые данные']
      )
  `)
}

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema()
    await seedTools()

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
    const category = request.nextUrl.searchParams.get("category")?.trim() ?? ""
    const status = request.nextUrl.searchParams.get("status")?.trim() ?? ""
    const user = request.nextUrl.searchParams.get("user")?.trim() || "VSIPEK"

    const values: string[] = [user]
    const where: string[] = []

    if (q) {
      values.push(`%${q}%`)
      where.push(
        `(t.name ILIKE $${values.length} OR t.description ILIKE $${values.length} OR t.instructions ILIKE $${values.length} OR array_to_string(t.tags, ' ') ILIKE $${values.length})`,
      )
    }

    if (category && category !== "all") {
      values.push(category)
      where.push(`t.category = $${values.length}`)
    }

    if (status && status !== "all") {
      values.push(status)
      where.push(`t.status = $${values.length}`)
    }

    const result = await db.query<ToolRow>(
      `
        SELECT
          t.id::text,
          t.name,
          t.slug,
          t.icon,
          t.category,
          t.status,
          t.description,
          t.instructions,
          t.launch_url,
          t.owner,
          t.version,
          t.tags,
          t.requirements,
          t.related_article_ids::text[],
          t.related_case_ids::text[],
          t.related_regulation_ids::text[],
          t.created_at::text,
          t.updated_at::text,
          EXISTS(
            SELECT 1 FROM legionhunt_wiki_tool_favorites f
            WHERE f.tool_id = t.id AND f.user_name = $1
          ) AS is_favorite,
          (
            SELECT COUNT(*) FROM legionhunt_wiki_tool_views v
            WHERE v.tool_id = t.id
          ) AS views
        FROM legionhunt_wiki_tools t
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY is_favorite DESC, views DESC, t.updated_at DESC
      `,
      values,
    )

    return NextResponse.json({ tools: result.rows.map(serialize) })
  } catch (error) {
    console.error("Tools GET error:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить инструменты." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const body = (await request.json()) as {
      name?: string
      icon?: string
      category?: string
      status?: "active" | "beta" | "archived"
      description?: string
      instructions?: string
      launchUrl?: string
      owner?: string
      version?: string
      tags?: string[]
      requirements?: string[]
    }

    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json(
        { error: "Название инструмента обязательно." },
        { status: 400 },
      )
    }

    const slug = `${slugify(name) || "tool"}-${Date.now().toString(36)}`

    const result = await db.query<{ id: string }>(
      `
        INSERT INTO legionhunt_wiki_tools
          (name, slug, icon, category, status, description, instructions, launch_url, owner, version, tags, requirements)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id::text
      `,
      [
        name,
        slug,
        body.icon?.trim() || "🛠️",
        body.category?.trim() || "Utilities",
        body.status || "active",
        body.description?.trim() || "",
        body.instructions?.trim() || "",
        body.launchUrl?.trim() || "",
        body.owner?.trim() || "VSIPEK",
        body.version?.trim() || "1.0",
        body.tags ?? [],
        body.requirements ?? [],
      ],
    )

    return NextResponse.json(
      { id: Number(result.rows[0].id) },
      { status: 201 },
    )
  } catch (error) {
    console.error("Tools POST error:", error)
    return NextResponse.json(
      { error: "Не удалось создать инструмент." },
      { status: 500 },
    )
  }
}
