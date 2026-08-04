import { db } from "@/lib/db"
import type { KnowledgeSource } from "./types"

function tokenize(question: string) {
  return Array.from(new Set(question.toLowerCase().split(/[^a-zа-яё0-9]+/i).map((token) => token.trim()).filter((token) => token.length >= 3))).slice(0, 12)
}

export async function runKnowledgeAgent(question: string): Promise<KnowledgeSource[]> {
  const tokens = tokenize(question)
  if (!tokens.length) return []

  const result = await db.query<KnowledgeSource>(`
    WITH query AS (SELECT plainto_tsquery('simple', $2::text) AS value),
    sources AS (
      SELECT id::text, 'article'::text AS kind, title, category, CONCAT_WS(' ', excerpt, content) AS content,
        to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(excerpt, '') || ' ' || COALESCE(content, '')) AS document
      FROM legionhunt_wiki_articles
      UNION ALL
      SELECT id::text, 'case'::text, title, category, CONCAT_WS(' ', situation, problem, solution, result, lessons, array_to_string(tags, ' ')),
        to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(situation, '') || ' ' || COALESCE(problem, '') || ' ' || COALESCE(solution, '') || ' ' || COALESCE(result, '') || ' ' || COALESCE(lessons, ''))
      FROM legionhunt_wiki_cases
      UNION ALL
      SELECT id::text, 'regulation'::text, title, category, CONCAT_WS(' ', summary, content, steps::text, array_to_string(tags, ' ')),
        to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(content, '') || ' ' || COALESCE(steps::text, '') || ' ' || COALESCE(array_to_string(tags, ' '), ''))
      FROM legionhunt_wiki_regulations
      UNION ALL
      SELECT id::text, 'tool'::text, name, category, CONCAT_WS(' ', description, instructions, array_to_string(tags, ' '), array_to_string(requirements, ' ')),
        to_tsvector('simple', COALESCE(name, '') || ' ' || COALESCE(category, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(instructions, '') || ' ' || COALESCE(array_to_string(tags, ' '), '') || ' ' || COALESCE(array_to_string(requirements, ' '), ''))
      FROM legionhunt_wiki_tools WHERE status <> 'archived'
    ),
    ranked AS (
      SELECT id,kind,title,category,content,ts_rank_cd(document, query.value, 32) AS full_text_rank,
        (SELECT COUNT(*)::int FROM unnest($1::text[]) AS token WHERE LOWER(title || ' ' || category || ' ' || content) LIKE '%' || token || '%') AS token_hits
      FROM sources CROSS JOIN query
      WHERE document @@ query.value OR EXISTS (SELECT 1 FROM unnest($1::text[]) AS token WHERE LOWER(title || ' ' || category || ' ' || content) LIKE '%' || token || '%')
    )
    SELECT id,kind,title,category,content,ROUND((full_text_rank * 100 + token_hits * 10)::numeric, 3)::float8 AS score
    FROM ranked ORDER BY full_text_rank DESC, token_hits DESC, title LIMIT 8
  `, [tokens, question])
  return result.rows
}
