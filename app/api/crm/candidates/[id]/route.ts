import { NextRequest, NextResponse } from "next/server"

import { db, ensureCrmSchema } from "@/lib/db"
import { runCandidateActivationWorkflow } from "@/lib/workflows"

const allowedStatuses = new Set(["new", "contact", "call", "training", "active"])
const allowedPriorities = new Set(["high", "medium", "low"])

type CandidateRow = {
  id: string
  name: string
  username: string
  country: string
  source: string
  mentor: string
  status: string
  priority: string
  score: number
  last_activity: string
  next_action: string
  note: string
  next_contact_at: string | null
}

function serialize(row: CandidateRow) {
  return {
    id: Number(row.id),
    name: row.name,
    username: row.username,
    country: row.country,
    source: row.source,
    mentor: row.mentor,
    status: row.status,
    priority: row.priority,
    score: row.score,
    lastActivity: row.last_activity,
    nextAction: row.next_action,
    note: row.note,
    nextContactAt: row.next_contact_at,
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCrmSchema()

    const { id } = await context.params
    const candidateId = Number(id)

    if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
      return NextResponse.json({ error: "Некорректный ID кандидата." }, { status: 400 })
    }

    const body = (await request.json()) as {
      name?: string
      username?: string
      country?: string
      source?: string
      status?: string
      priority?: string
      nextAction?: string
      note?: string
      mentor?: string
      score?: number
      nextContactAt?: string | null
      updatedBy?: string
    }

    const previousResult = await db.query<CandidateRow>(
      `SELECT id::text, name, username, country, source, mentor, status, priority, score, last_activity, next_action, note, next_contact_at::text FROM legionhunt_candidates WHERE id = $1`,
      [candidateId],
    )
    const previous = previousResult.rows[0]

    if (!previous) {
      return NextResponse.json({ error: "Кандидат не найден." }, { status: 404 })
    }

    const updates: string[] = []
    const values: Array<string | number | null> = []
    const changes: string[] = []

    function addUpdate(column: string, value: string | number | null, label: string, oldValue: unknown) {
      values.push(value)
      updates.push(`${column} = $${values.length}`)
      if (String(oldValue ?? "") !== String(value ?? "")) changes.push(`${label}: ${String(oldValue ?? "—")} → ${String(value ?? "—")}`)
    }

    if (body.name !== undefined) {
      const value = body.name.trim()
      if (value.length < 2) return NextResponse.json({ error: "Имя должно содержать минимум 2 символа." }, { status: 400 })
      addUpdate("name", value, "Имя", previous.name)
    }
    if (body.username !== undefined) addUpdate("username", body.username.trim(), "Telegram", previous.username)
    if (body.country !== undefined) addUpdate("country", body.country.trim(), "Страна", previous.country)
    if (body.source !== undefined) addUpdate("source", body.source.trim(), "Источник", previous.source)
    if (body.mentor !== undefined) addUpdate("mentor", body.mentor.trim(), "Наставник", previous.mentor)

    if (body.status !== undefined) {
      if (!allowedStatuses.has(body.status)) return NextResponse.json({ error: "Недопустимый статус." }, { status: 400 })
      addUpdate("status", body.status, "Этап", previous.status)
    }

    if (body.priority !== undefined) {
      if (!allowedPriorities.has(body.priority)) return NextResponse.json({ error: "Недопустимый приоритет." }, { status: 400 })
      addUpdate("priority", body.priority, "Приоритет", previous.priority)
    }

    if (body.nextAction !== undefined) addUpdate("next_action", body.nextAction.trim(), "Следующее действие", previous.next_action)
    if (body.note !== undefined) addUpdate("note", body.note.trim(), "Заметка", previous.note)

    if (body.score !== undefined) {
      const score = Math.max(0, Math.min(100, Math.round(Number(body.score) || 0)))
      addUpdate("score", score, "AI Score", previous.score)
    }

    if (body.nextContactAt !== undefined) {
      addUpdate("next_contact_at", body.nextContactAt || null, "Следующий контакт", previous.next_contact_at)
    }

    if (!updates.length) return NextResponse.json({ error: "Нет данных для обновления." }, { status: 400 })

    updates.push("updated_at = NOW()")
    values.push(candidateId)

    const result = await db.query<CandidateRow>(
      `UPDATE legionhunt_candidates SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING id::text, name, username, country, source, mentor, status, priority, score, last_activity, next_action, note, next_contact_at::text`,
      values,
    )

    const updated = result.rows[0]
    if (!updated) return NextResponse.json({ error: "Кандидат не найден." }, { status: 404 })

    if (changes.length) {
      await db.query(
        `INSERT INTO legionhunt_candidate_activity (candidate_id, event_type, title, description, created_by) VALUES ($1, 'update', $2, $3, $4)`,
        [candidateId, "Обновлена карточка кандидата", changes.join("\n"), body.updatedBy?.trim() || "LegionHunt User"],
      )
    }

    let workflow: { skipped?: boolean; runId?: number; memberId?: number; error?: string } | null = null
    if (body.status === "active" && previous.status !== "active") {
      try {
        workflow = await runCandidateActivationWorkflow({ candidateId, name: updated.name, username: updated.username, mentor: updated.mentor })
      } catch (workflowError) {
        console.error("Candidate activation workflow error:", workflowError)
        workflow = { error: "Автоматизация не завершилась. Её можно повторить в Workflow Center." }
      }
    }

    return NextResponse.json({ candidate: serialize(updated), workflow })
  } catch (error) {
    console.error("CRM PATCH error:", error)
    return NextResponse.json({ error: "Не удалось обновить кандидата." }, { status: 500 })
  }
}
