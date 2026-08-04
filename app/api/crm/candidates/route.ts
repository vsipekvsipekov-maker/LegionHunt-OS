import { NextRequest, NextResponse } from "next/server"

import { db, ensureCrmSchema } from "@/lib/db"

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

async function seedIfEnabled() {
  // Release builds never create demo candidates automatically.
  return
}

export async function GET() {
  try {
    await ensureCrmSchema()
    await seedIfEnabled()

    const result = await db.query<CandidateRow>(`
      SELECT
        id::text,
        name,
        username,
        country,
        source,
        mentor,
        status,
        priority,
        score,
        last_activity,
        next_action,
        note,
        next_contact_at::text
      FROM legionhunt_candidates
      ORDER BY updated_at DESC, id DESC
    `)

    return NextResponse.json({
      candidates: result.rows.map(serialize),
    })
  } catch (error) {
    console.error("CRM GET error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить кандидатов.",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema()

    const body = (await request.json()) as {
      name?: string
      username?: string
      country?: string
      source?: string
      mentor?: string
      priority?: string
      nextAction?: string
      note?: string
      nextContactAt?: string | null
    }

    const name = body.name?.trim()

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Имя должно содержать минимум 2 символа." },
        { status: 400 },
      )
    }

    const priority = ["high", "medium", "low"].includes(
      body.priority ?? "",
    )
      ? body.priority
      : "medium"

    const result = await db.query<CandidateRow>(
      `
        INSERT INTO legionhunt_candidates
          (name, username, country, source, mentor, priority, next_action, note, next_contact_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          id::text,
          name,
          username,
          country,
          source,
          mentor,
          status,
          priority,
          score,
          last_activity,
          next_action,
          note,
          next_contact_at::text
      `,
      [
        name,
        body.username?.trim() ?? "",
        body.country?.trim() ?? "",
        body.source?.trim() ?? "",
        body.mentor?.trim() ?? "",
        priority,
        body.nextAction?.trim() ?? "Связаться с кандидатом",
        body.note?.trim() ?? "",
        body.nextContactAt || null,
      ],
    )

    return NextResponse.json(
      { candidate: serialize(result.rows[0]) },
      { status: 201 },
    )
  } catch (error) {
    console.error("CRM POST error:", error)

    return NextResponse.json(
      { error: "Не удалось создать кандидата." },
      { status: 500 },
    )
  }
}
