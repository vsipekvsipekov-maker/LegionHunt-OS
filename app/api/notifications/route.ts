import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type NotificationRow = {
  key: string
  module: "crm" | "academy" | "wiki" | "team" | "ai" | "calendar"
  title: string
  description: string
  href: string
  created_at: string
  priority: "high" | "normal" | "low"
  is_read: boolean
}

const currentUser = "VSIPEK"

export async function GET(request: NextRequest) {
  try {
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
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 30), 5), 80)

    const result = await db.query<NotificationRow>(
      `
      WITH notification_items AS (
        SELECT
          'crm:' || ca.id::text AS key,
          'crm'::text AS module,
          ca.title,
          COALESCE(NULLIF(ca.description, ''), c.name) AS description,
          '/crm'::text AS href,
          ca.created_at,
          CASE WHEN ca.event_type IN ('created','status_changed','task') THEN 'high' ELSE 'normal' END::text AS priority
        FROM legionhunt_candidate_activity ca
        JOIN legionhunt_candidates c ON c.id = ca.candidate_id
        WHERE ca.created_at > NOW() - INTERVAL '30 days'

        UNION ALL

        SELECT
          'academy-submission:' || s.id::text,
          'academy'::text,
          CASE s.status
            WHEN 'submitted' THEN 'Новое домашнее задание на проверке'
            WHEN 'revision' THEN 'Задание отправлено на доработку'
            WHEN 'accepted' THEN 'Домашнее задание принято'
            ELSE 'Задание Academy обновлено'
          END,
          a.title || ' · ' || s.user_name,
          '/academy'::text,
          s.updated_at,
          CASE WHEN s.status = 'submitted' THEN 'high' ELSE 'normal' END::text
        FROM legionhunt_academy_assignment_submissions s
        JOIN legionhunt_academy_assignments a ON a.id = s.assignment_id
        WHERE s.updated_at > NOW() - INTERVAL '30 days'

        UNION ALL

        SELECT
          'academy-certificate:' || cert.id::text,
          'academy'::text,
          'Получен новый сертификат',
          cert.user_name || ' · ' || course.title,
          '/academy'::text,
          cert.issued_at,
          'normal'::text
        FROM legionhunt_academy_certificates cert
        JOIN legionhunt_academy_courses course ON course.id = cert.course_id
        WHERE cert.issued_at > NOW() - INTERVAL '30 days'

        UNION ALL

        SELECT
          'wiki:' || a.id::text,
          'wiki'::text,
          CASE a.action
            WHEN 'created' THEN 'Создан новый материал Wiki'
            WHEN 'updated' THEN 'Материал Wiki обновлён'
            WHEN 'deleted' THEN 'Материал Wiki удалён'
            ELSE 'Активность в Wiki'
          END,
          COALESCE(NULLIF(a.entity_title, ''), a.entity_type),
          '/wiki'::text,
          a.created_at,
          'normal'::text
        FROM legionhunt_activity a
        WHERE a.entity_type IN ('article','case','regulation','tool','wiki')
          AND a.created_at > NOW() - INTERVAL '30 days'

        UNION ALL

        SELECT
          'team:' || ta.id::text,
          'team'::text,
          ta.title,
          COALESCE(NULLIF(ta.description, ''), tm.display_name),
          '/team'::text,
          ta.created_at,
          CASE WHEN ta.event_type IN ('role_changed','mentor_assigned','kpi_changed') THEN 'high' ELSE 'normal' END::text
        FROM legionhunt_team_activity ta
        JOIN legionhunt_team_members tm ON tm.id = ta.member_id
        WHERE ta.created_at > NOW() - INTERVAL '30 days'

        UNION ALL

        SELECT
          'ai-learning:' || q.id::text,
          'ai'::text,
          'AI ждёт обучения',
          LEFT(q.question, 160),
          '/ai'::text,
          q.updated_at,
          CASE WHEN q.occurrences >= 3 THEN 'high' ELSE 'normal' END::text
        FROM legionhunt_ai_learning_queue q
        WHERE q.status = 'pending'


        UNION ALL

        SELECT
          'calendar:' || e.id::text,
          'calendar'::text,
          'Скоро событие: ' || e.title,
          CASE WHEN e.location <> '' THEN e.location ELSE COALESCE(NULLIF(e.description, ''), 'Calendar Center') END,
          '/calendar'::text,
          e.starts_at,
          CASE WHEN e.starts_at <= NOW() + INTERVAL '2 hours' THEN 'high' ELSE 'normal' END::text
        FROM legionhunt_calendar_events e
        WHERE e.status = 'scheduled'
          AND e.starts_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      )
      SELECT
        n.key,
        n.module,
        n.title,
        n.description,
        n.href,
        n.created_at,
        n.priority,
        (r.notification_key IS NOT NULL) AS is_read
      FROM notification_items n
      LEFT JOIN legionhunt_notification_reads r
        ON r.notification_key = n.key AND r.user_name = $1
      ORDER BY n.created_at DESC
      LIMIT $2
      `,
      [currentUser, limit],
    )

    const unreadCount = result.rows.filter((item) => !item.is_read).length
    return NextResponse.json({ notifications: result.rows, unreadCount })
  } catch (error) {
    console.error("Notifications GET error:", error)
    return NextResponse.json({ error: "Не удалось загрузить уведомления." }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const body = (await request.json()) as { keys?: string[]; all?: boolean }

    if (body.all) {
      const source = await db.query<{ key: string }>(`
        SELECT key FROM (
          SELECT 'crm:' || id::text AS key FROM legionhunt_candidate_activity WHERE created_at > NOW() - INTERVAL '30 days'
          UNION ALL SELECT 'academy-submission:' || id::text FROM legionhunt_academy_assignment_submissions WHERE updated_at > NOW() - INTERVAL '30 days'
          UNION ALL SELECT 'academy-certificate:' || id::text FROM legionhunt_academy_certificates WHERE issued_at > NOW() - INTERVAL '30 days'
          UNION ALL SELECT 'wiki:' || id::text FROM legionhunt_activity WHERE entity_type IN ('article','case','regulation','tool','wiki') AND created_at > NOW() - INTERVAL '30 days'
          UNION ALL SELECT 'team:' || id::text FROM legionhunt_team_activity WHERE created_at > NOW() - INTERVAL '30 days'
          UNION ALL SELECT 'ai-learning:' || id::text FROM legionhunt_ai_learning_queue WHERE status = 'pending'
          UNION ALL SELECT 'calendar:' || id::text FROM legionhunt_calendar_events WHERE status = 'scheduled' AND starts_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
        ) items
      `)
      if (source.rows.length) {
        await db.query(
          `INSERT INTO legionhunt_notification_reads (user_name, notification_key)
           SELECT $1, unnest($2::text[])
           ON CONFLICT (user_name, notification_key) DO UPDATE SET read_at = NOW()`,
          [currentUser, source.rows.map((row) => row.key)],
        )
      }
      return NextResponse.json({ ok: true })
    }

    const keys = Array.isArray(body.keys) ? body.keys.filter(Boolean).slice(0, 100) : []
    if (!keys.length) return NextResponse.json({ ok: true })

    await db.query(
      `INSERT INTO legionhunt_notification_reads (user_name, notification_key)
       SELECT $1, unnest($2::text[])
       ON CONFLICT (user_name, notification_key) DO UPDATE SET read_at = NOW()`,
      [currentUser, keys],
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Notifications PATCH error:", error)
    return NextResponse.json({ error: "Не удалось обновить уведомления." }, { status: 500 })
  }
}
