import { db } from "@/lib/db"
import type { AgentContext, MemoryInsight } from "./types"

function keywords(values: string[]) {
  const stop = new Set(["как","что","где","это","тот","эта","для","или","при","про","мне","нужно","можно","есть","the","and","with"])
  const counts = new Map<string, number>()
  for (const value of values) {
    for (const token of value.toLowerCase().split(/[^a-zа-яё0-9]+/i)) {
      if (token.length < 4 || stop.has(token)) continue
      counts.set(token, (counts.get(token) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a,b) => b[1]-a[1]).slice(0,6).map(([token]) => token)
}

export async function runMemoryAgent(context: AgentContext): Promise<MemoryInsight> {
  const result = await db.query<{content:string}>(`
    SELECT content FROM legionhunt_ai_messages
    WHERE session_id=$1 AND role='user'
    ORDER BY created_at DESC,id DESC LIMIT 8
  `,[context.sessionId])
  const previousQuestions = result.rows.map((row) => row.content).reverse().slice(-5)
  const recentTopics = keywords(previousQuestions)
  return {
    previousQuestions,
    recentTopics,
    contextHint: recentTopics.length ? `Учитывай недавние темы: ${recentTopics.join(", ")}.` : "Контекст прошлых тем отсутствует.",
  }
}
