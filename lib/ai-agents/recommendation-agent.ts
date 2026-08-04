import { db } from "@/lib/db"
import type { KnowledgeSource } from "./types"

export async function runRecommendationAgent(question: string, sources: KnowledgeSource[]): Promise<KnowledgeSource[]> {
  if (!sources.length) return []
  const excluded = sources.map((source) => `${source.kind}:${source.id}`)
  const categories = [...new Set(sources.map((source) => source.category).filter(Boolean))].slice(0,4)
  const result = await db.query<KnowledgeSource>(`
    WITH candidates AS (
      SELECT id::text,'article'::text kind,title,category,CONCAT_WS(' ',excerpt,content) content,updated_at FROM legionhunt_wiki_articles
      UNION ALL SELECT id::text,'case'::text,title,category,CONCAT_WS(' ',situation,problem,solution,result,lessons),updated_at FROM legionhunt_wiki_cases
      UNION ALL SELECT id::text,'regulation'::text,title,category,CONCAT_WS(' ',summary,content,steps::text),updated_at FROM legionhunt_wiki_regulations
      UNION ALL SELECT id::text,'tool'::text,name,category,CONCAT_WS(' ',description,instructions),updated_at FROM legionhunt_wiki_tools WHERE status<>'archived'
    )
    SELECT id,kind,title,category,content,
      (CASE WHEN category=ANY($1::text[]) THEN 20 ELSE 0 END + CASE WHEN LOWER(title) LIKE '%' || LOWER($2) || '%' THEN 10 ELSE 0 END)::float8 score
    FROM candidates
    WHERE NOT ((kind || ':' || id)=ANY($3::text[]))
      AND (category=ANY($1::text[]) OR LOWER(title || ' ' || content) LIKE ANY(SELECT '%' || word || '%' FROM unnest(string_to_array(LOWER($2),' ')) word WHERE length(word)>=4))
    ORDER BY score DESC,updated_at DESC LIMIT 4
  `,[categories,question,excluded]).catch(() => ({ rows: [] as KnowledgeSource[] }))
  return result.rows
}
