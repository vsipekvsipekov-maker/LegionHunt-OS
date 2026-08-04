import { db } from "@/lib/db"

function normalizeQuestion(value: string) {
  return value.toLowerCase().replace(/[^a-zа-яё0-9\s]+/gi, " ").replace(/\s+/g, " ").trim().slice(0, 500)
}

export async function runLearningAgent(question: string, user: string) {
  const normalized = normalizeQuestion(question)
  if (!normalized || normalized.length < 4) return null
  const result = await db.query<{ id: string }>(`
    INSERT INTO legionhunt_ai_learning_queue(normalized_question,question,first_user,last_user) VALUES($1,$2,$3,$3)
    ON CONFLICT(normalized_question) DO UPDATE SET
      occurrences=legionhunt_ai_learning_queue.occurrences + 1, question=EXCLUDED.question, last_user=EXCLUDED.last_user, updated_at=NOW(),
      status=CASE WHEN legionhunt_ai_learning_queue.status='ignored' THEN 'pending' ELSE legionhunt_ai_learning_queue.status END
    RETURNING id::text
  `, [normalized, question, user])
  return Number(result.rows[0]?.id ?? 0) || null
}
