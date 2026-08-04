import { db, ensureCrmSchema } from "@/lib/db"

export type AiContextSource = {
  type: "crm" | "wiki" | "team" | "academy"
  id: string
  title: string
  href: string
}

type ContextResult = {
  text: string
  sources: AiContextSource[]
}

const STOP_WORDS = new Set(["что", "кто", "где", "когда", "как", "какой", "какая", "какие", "известно", "покажи", "расскажи", "найди", "есть", "про", "для", "это", "его", "ее", "все", "мне", "моя", "мой", "наша", "наш", "или", "и", "по", "об", "о", "в", "на", "с"])

function extractKeywords(value: string) {
  const words = value
    .toLowerCase()
    .replace(/[^a-zа-яё0-9@_-]+/gi, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word))
  return [...new Set(words)].slice(0, 8)
}

export async function buildLegionContext(message: string): Promise<ContextResult> {
  await ensureCrmSchema()
  const keywords = extractKeywords(message)
  const patterns = keywords.map((word) => `%${word}%`)
  const sources: AiContextSource[] = []
  const sections: string[] = []

  const stats = await db.query<{
    candidates: string
    active_candidates: string
    members: string
    avg_kpi: string | null
    articles: string
    courses: string
  }>(`
    SELECT
      (SELECT count(*)::text FROM legionhunt_candidates) candidates,
      (SELECT count(*)::text FROM legionhunt_candidates WHERE status='active') active_candidates,
      (SELECT count(*)::text FROM legionhunt_team_members WHERE status <> 'inactive') members,
      (SELECT round(avg(kpi))::text FROM legionhunt_team_members WHERE status <> 'inactive') avg_kpi,
      (SELECT count(*)::text FROM legionhunt_wiki_articles) articles,
      (SELECT count(*)::text FROM legionhunt_academy_courses WHERE status='published') courses
  `)
  const s = stats.rows[0]
  sections.push(`СВОДКА СИСТЕМЫ\nКандидатов: ${s.candidates}; активных: ${s.active_candidates}; участников Team: ${s.members}; средний KPI: ${s.avg_kpi ?? "нет данных"}%; статей Wiki: ${s.articles}; опубликованных курсов: ${s.courses}.`)

  if (patterns.length > 0) {
    const [crm, wiki, team, academy] = await Promise.all([
      db.query<{ id: string; name: string; username: string; status: string; priority: string; score: number; mentor: string; next_action: string; note: string }>(`
        SELECT id::text, name, username, status, priority, score, mentor, next_action, note
        FROM legionhunt_candidates
        WHERE EXISTS (
          SELECT 1 FROM unnest($1::text[]) pattern
          WHERE name ILIKE pattern OR username ILIKE pattern OR mentor ILIKE pattern OR note ILIKE pattern OR next_action ILIKE pattern
        )
        ORDER BY updated_at DESC LIMIT 5
      `, [patterns]),
      db.query<{ id: string; title: string; slug: string; category: string; excerpt: string; content: string }>(`
        SELECT id::text, title, slug, category, excerpt, left(content, 1800) content
        FROM legionhunt_wiki_articles
        WHERE EXISTS (
          SELECT 1 FROM unnest($1::text[]) pattern
          WHERE title ILIKE pattern OR category ILIKE pattern OR excerpt ILIKE pattern OR content ILIKE pattern
        )
        ORDER BY updated_at DESC LIMIT 4
      `, [patterns]),
      db.query<{ id: string; display_name: string; username: string; status: string; kpi: number; position_title: string; role_name: string | null; department_name: string | null; bio: string }>(`
        SELECT m.id::text, m.display_name, m.username, m.status, m.kpi, m.position_title,
               r.name role_name, d.name department_name, m.bio
        FROM legionhunt_team_members m
        LEFT JOIN legionhunt_team_roles r ON r.id=m.role_id
        LEFT JOIN legionhunt_team_departments d ON d.id=m.department_id
        WHERE EXISTS (
          SELECT 1 FROM unnest($1::text[]) pattern
          WHERE m.display_name ILIKE pattern OR m.username ILIKE pattern OR m.email ILIKE pattern OR m.position_title ILIKE pattern OR m.bio ILIKE pattern
        )
        ORDER BY m.updated_at DESC LIMIT 5
      `, [patterns]),
      db.query<{ id: string; title: string; slug: string; category: string; level: string; description: string; estimated_minutes: number }>(`
        SELECT id::text, title, slug, category, level, description, estimated_minutes
        FROM legionhunt_academy_courses
        WHERE status='published' AND EXISTS (
          SELECT 1 FROM unnest($1::text[]) pattern
          WHERE title ILIKE pattern OR category ILIKE pattern OR description ILIKE pattern
        )
        ORDER BY updated_at DESC LIMIT 4
      `, [patterns]),
    ])

    if (crm.rows.length) {
      sections.push("CRM\n" + crm.rows.map(x => `#${x.id} ${x.name} (${x.username || "без username"}) — статус ${x.status}, приоритет ${x.priority}, score ${x.score}, наставник ${x.mentor || "не назначен"}. Следующее действие: ${x.next_action || "не задано"}. Заметка: ${x.note || "нет"}.`).join("\n"))
      sources.push(...crm.rows.map(x => ({ type: "crm" as const, id: x.id, title: x.name, href: "/crm" })))
    }
    if (wiki.rows.length) {
      sections.push("WIKI\n" + wiki.rows.map(x => `#${x.id} ${x.title} [${x.category}]\n${x.excerpt}\n${x.content}`).join("\n\n"))
      sources.push(...wiki.rows.map(x => ({ type: "wiki" as const, id: x.id, title: x.title, href: "/wiki" })))
    }
    if (team.rows.length) {
      sections.push("TEAM\n" + team.rows.map(x => `#${x.id} ${x.display_name} (${x.username || "без username"}) — ${x.position_title || x.role_name || "роль не указана"}, отдел ${x.department_name || "не указан"}, статус ${x.status}, KPI ${x.kpi}%. ${x.bio || ""}`).join("\n"))
      sources.push(...team.rows.map(x => ({ type: "team" as const, id: x.id, title: x.display_name, href: "/team" })))
    }
    if (academy.rows.length) {
      sections.push("ACADEMY\n" + academy.rows.map(x => `#${x.id} ${x.title} [${x.category}, ${x.level}] — ${x.estimated_minutes} мин. ${x.description}`).join("\n"))
      sources.push(...academy.rows.map(x => ({ type: "academy" as const, id: x.id, title: x.title, href: "/academy" })))
    }
  }

  return { text: sections.join("\n\n---\n\n").slice(0, 14000), sources: sources.slice(0, 12) }
}
