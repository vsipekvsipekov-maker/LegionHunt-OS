export type KnowledgeSource = {
  id: string
  kind: "article" | "case" | "regulation" | "tool"
  title: string
  category: string
  content: string
  score: number
}

export type AgentContext = {
  question: string
  retrievalQuery: string
  user: string
  sessionId: number
}

export type MemoryInsight = {
  recentTopics: string[]
  previousQuestions: string[]
  contextHint: string
}

export type MentorGuidance = {
  audience: "newcomer" | "mentor" | "admin" | "general"
  responseStyle: string
}

export type AgentPipelineResult = {
  sources: KnowledgeSource[]
  recommendations: KnowledgeSource[]
  memory: MemoryInsight
  mentor: MentorGuidance
  learningQueueId: number | null
  route: "knowledge" | "learning"
  agents: string[]
}
