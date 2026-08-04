import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

async function ensureCalendarSchema() {
  await ensureCrmSchema()
  await db.query(`
    CREATE TABLE IF NOT EXISTS legionhunt_calendar_events (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(240) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category VARCHAR(30) NOT NULL DEFAULT 'personal',
      status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      all_day BOOLEAN NOT NULL DEFAULT FALSE,
      location VARCHAR(240) NOT NULL DEFAULT '',
      owner_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      related_module VARCHAR(30) NOT NULL DEFAULT '',
      related_id BIGINT NULL,
      reminder_minutes INTEGER NOT NULL DEFAULT 30,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT legionhunt_calendar_category_check CHECK (category IN ('crm','academy','team','personal','deadline')),
      CONSTRAINT legionhunt_calendar_status_check CHECK (status IN ('scheduled','completed','cancelled')),
      CONSTRAINT legionhunt_calendar_dates_check CHECK (ends_at >= starts_at)
    );
    CREATE INDEX IF NOT EXISTS legionhunt_calendar_events_range_idx ON legionhunt_calendar_events(starts_at, ends_at);
    CREATE INDEX IF NOT EXISTS legionhunt_calendar_events_owner_idx ON legionhunt_calendar_events(owner_name, starts_at);
  `)

  await db.query(`
    DELETE FROM legionhunt_calendar_events
    WHERE (title, description) IN (
      ('Командный созвон','Еженедельная синхронизация команды'),
      ('CRM: проверить кандидатов','Разбор новых заявок и следующих действий'),
      ('Academy: проверка заданий','Проверить отправленные домашние задания'),
      ('Недельный отчёт','Подготовить краткий отчёт по результатам')
    );
  `)

}

type EventRow = {
  id: string
  title: string
  description: string
  category: "crm" | "academy" | "team" | "personal" | "deadline"
  status: "scheduled" | "completed" | "cancelled"
  startsAt: string
  endsAt: string
  allDay: boolean
  location: string
  ownerName: string
  relatedModule: string
  relatedId: string | null
  reminderMinutes: number
}

export async function GET(request: NextRequest) {
  try {
    await ensureCalendarSchema()
    const from = request.nextUrl.searchParams.get("from")
    const to = request.nextUrl.searchParams.get("to")
    const category = request.nextUrl.searchParams.get("category") ?? "all"
    const rangeFrom = from ? new Date(from) : new Date(Date.now() - 7 * 86400000)
    const rangeTo = to ? new Date(to) : new Date(Date.now() + 35 * 86400000)

    const result = await db.query<EventRow>(`
      SELECT
        id::text,
        title,
        description,
        category,
        status,
        starts_at AS "startsAt",
        ends_at AS "endsAt",
        all_day AS "allDay",
        location,
        owner_name AS "ownerName",
        related_module AS "relatedModule",
        related_id::text AS "relatedId",
        reminder_minutes AS "reminderMinutes"
      FROM legionhunt_calendar_events
      WHERE starts_at < $2 AND ends_at > $1
        AND ($3 = 'all' OR category = $3)
      ORDER BY starts_at ASC
    `, [rangeFrom.toISOString(), rangeTo.toISOString(), category])

    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate()+1)
    const upcoming = result.rows.filter((event) => new Date(event.startsAt) >= new Date() && event.status === "scheduled")
    const todayCount = result.rows.filter((event) => new Date(event.startsAt) < todayEnd && new Date(event.endsAt) > todayStart).length
    const completed = result.rows.filter((event) => event.status === "completed").length

    return NextResponse.json({
      events: result.rows,
      metrics: { total: result.rows.length, today: todayCount, upcoming: upcoming.length, completed },
    })
  } catch (error) {
    console.error("Calendar GET error:", error)
    return NextResponse.json({ error: "Не удалось загрузить календарь." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCalendarSchema()
    const body = await request.json() as Partial<EventRow>
    const title = body.title?.trim()
    if (!title || !body.startsAt || !body.endsAt) return NextResponse.json({ error: "Заполните название, начало и окончание." }, { status: 400 })
    const start = new Date(body.startsAt)
    const end = new Date(body.endsAt)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return NextResponse.json({ error: "Некорректные даты события." }, { status: 400 })

    const result = await db.query<{ id: string }>(`
      INSERT INTO legionhunt_calendar_events
        (title, description, category, status, starts_at, ends_at, all_day, location, owner_name, related_module, related_id, reminder_minutes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id::text
    `, [
      title,
      body.description?.trim() ?? "",
      body.category ?? "personal",
      body.status ?? "scheduled",
      start.toISOString(),
      end.toISOString(),
      Boolean(body.allDay),
      body.location?.trim() ?? "",
      body.ownerName?.trim() || "VSIPEK",
      body.relatedModule?.trim() ?? "",
      body.relatedId ? Number(body.relatedId) : null,
      Math.max(0, Math.min(Number(body.reminderMinutes ?? 30), 10080)),
    ])
    return NextResponse.json({ id: result.rows[0].id })
  } catch (error) {
    console.error("Calendar POST error:", error)
    return NextResponse.json({ error: "Не удалось создать событие." }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureCalendarSchema()
    const body = await request.json() as Partial<EventRow> & { id?: string }
    if (!body.id) return NextResponse.json({ error: "Не указан ID события." }, { status: 400 })
    const start = body.startsAt ? new Date(body.startsAt) : null
    const end = body.endsAt ? new Date(body.endsAt) : null
    await db.query(`
      UPDATE legionhunt_calendar_events SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        category = COALESCE($4, category),
        status = COALESCE($5, status),
        starts_at = COALESCE($6, starts_at),
        ends_at = COALESCE($7, ends_at),
        all_day = COALESCE($8, all_day),
        location = COALESCE($9, location),
        reminder_minutes = COALESCE($10, reminder_minutes),
        updated_at = NOW()
      WHERE id = $1
    `, [Number(body.id), body.title?.trim() || null, body.description ?? null, body.category ?? null, body.status ?? null, start?.toISOString() ?? null, end?.toISOString() ?? null, typeof body.allDay === "boolean" ? body.allDay : null, body.location ?? null, body.reminderMinutes ?? null])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Calendar PATCH error:", error)
    return NextResponse.json({ error: "Не удалось обновить событие." }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureCalendarSchema()
    const id = Number(request.nextUrl.searchParams.get("id"))
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Некорректный ID." }, { status: 400 })
    await db.query("DELETE FROM legionhunt_calendar_events WHERE id = $1", [id])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Calendar DELETE error:", error)
    return NextResponse.json({ error: "Не удалось удалить событие." }, { status: 500 })
  }
}
