import { db } from "@/lib/db"
import { runKnowledgeAgent } from "./knowledge-agent"
import { runLearningAgent } from "./learning-agent"
import { runMemoryAgent } from "./memory-agent"
import { runMentorAgent } from "./mentor-agent"
import { runRecommendationAgent } from "./recommendation-agent"
import type { AgentContext, AgentPipelineResult } from "./types"

async function recordAgentRun(agent: string, context: AgentContext, status: "success" | "skipped" | "failed", durationMs: number, metadata: Record<string, unknown> = {}) {
  await db.query(`INSERT INTO legionhunt_ai_agent_runs(agent_name,session_id,user_name,status,duration_ms,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb)`,
    [agent, context.sessionId, context.user, status, durationMs, JSON.stringify(metadata)]).catch((error) => console.error("Agent run logging error:", error))
}

async function measured<T>(name: string, context: AgentContext, task: () => Promise<T>): Promise<T> {
  const started = Date.now()
  try {
    const value = await task()
    await recordAgentRun(name, context, "success", Date.now()-started)
    return value
  } catch (error) {
    await recordAgentRun(name, context, "failed", Date.now()-started,{error:error instanceof Error?error.message:"unknown"})
    throw error
  }
}

export async function runAgentPipeline(context: AgentContext): Promise<AgentPipelineResult> {
  const [sources, memory, mentor] = await Promise.all([
    measured("knowledge",context,()=>runKnowledgeAgent(context.retrievalQuery || context.question)),
    measured("memory",context,()=>runMemoryAgent(context)),
    measured("mentor",context,()=>runMentorAgent(context)),
  ])

  if (sources.length) {
    const recommendations = await measured("recommendation",context,()=>runRecommendationAgent(context.question,sources))
    return { sources,recommendations,memory,mentor,learningQueueId:null,route:"knowledge",agents:["knowledge","memory","mentor","recommendation"] }
  }

  await recordAgentRun("recommendation",context,"skipped",0,{reason:"no_sources"})
  const learningQueueId = await measured("learning",context,()=>runLearningAgent(context.question,context.user))
  return { sources:[],recommendations:[],memory,mentor,learningQueueId,route:"learning",agents:["knowledge","memory","mentor","learning"] }
}
