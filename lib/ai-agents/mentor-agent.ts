import type { AgentContext, MentorGuidance } from "./types"

export async function runMentorAgent(context: AgentContext): Promise<MentorGuidance> {
  const q = context.question.toLowerCase()
  if (/админ|api|база|sql|сервер|настрой|ошибк|техническ/.test(q)) {
    return { audience: "admin", responseStyle: "Дай точный технический ответ, укажи проверки, риски и последовательность действий." }
  }
  if (/наставник|ученик|команда|обучен|контрол/.test(q)) {
    return { audience: "mentor", responseStyle: "Ответь как наставнику: цель, порядок действий, контроль результата и типичные ошибки." }
  }
  if (/нович|первый раз|не понимаю|с чего начать|что дальше/.test(q)) {
    return { audience: "newcomer", responseStyle: "Объясни простыми словами и дай короткие пронумерованные шаги без лишней терминологии." }
  }
  return { audience: "general", responseStyle: "Ответь практично, кратко и структурированно." }
}
