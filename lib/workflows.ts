import type { PoolClient } from "pg"
import { db } from "@/lib/db"

type CandidateWorkflowInput = {
  candidateId: number
  name: string
  username: string
  mentor: string
}

async function addStep(client: PoolClient, runId: number, stepKey: string, title: string, detail: string) {
  await client.query(
    `INSERT INTO legionhunt_workflow_steps (run_id, step_key, title, status, detail)
     VALUES ($1,$2,$3,'completed',$4)`,
    [runId, stepKey, title, detail],
  )
}

export async function runCandidateActivationWorkflow(input: CandidateWorkflowInput) {
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const existing = await client.query<{ id: string; status: string }>(
      `SELECT id::text, status FROM legionhunt_workflow_runs
       WHERE workflow_key='candidate_activation' AND entity_type='candidate' AND entity_id=$1
       ORDER BY id DESC LIMIT 1`,
      [input.candidateId],
    )
    if (existing.rows[0]?.status === "completed") {
      await client.query("ROLLBACK")
      return { skipped: true, runId: Number(existing.rows[0].id) }
    }

    const run = await client.query<{ id: string }>(
      `INSERT INTO legionhunt_workflow_runs
       (workflow_key, entity_type, entity_id, metadata)
       VALUES ('candidate_activation','candidate',$1,$2::jsonb)
       RETURNING id::text`,
      [input.candidateId, JSON.stringify({ candidateName: input.name })],
    )
    const runId = Number(run.rows[0].id)

    const role = await client.query<{ id: string }>(
      `SELECT id::text FROM legionhunt_team_roles WHERE name='Student' LIMIT 1`,
    )
    const department = await client.query<{ id: string }>(
      `SELECT id::text FROM legionhunt_team_departments WHERE name='Recruiting' LIMIT 1`,
    )
    const mentor = await client.query<{ id: string }>(
      `SELECT tm.id::text
       FROM legionhunt_team_members tm
       LEFT JOIN legionhunt_team_roles tr ON tr.id=tm.role_id
       WHERE ($1 <> '' AND (LOWER(tm.display_name)=LOWER($1) OR LOWER(tm.username)=LOWER($1)))
          OR tr.name='Mentor'
       ORDER BY CASE WHEN $1 <> '' AND (LOWER(tm.display_name)=LOWER($1) OR LOWER(tm.username)=LOWER($1)) THEN 0 ELSE 1 END,
                tm.kpi DESC
       LIMIT 1`,
      [input.mentor.trim()],
    )
    const username = input.username.trim() || `@candidate${input.candidateId}`
    const found = await client.query<{ id: string }>(
      `SELECT id::text FROM legionhunt_team_members WHERE LOWER(username)=LOWER($1) ORDER BY id LIMIT 1`,
      [username],
    )
    let memberId = Number(found.rows[0]?.id)
    if (!memberId) {
      const member = await client.query<{ id: string }>(
        `INSERT INTO legionhunt_team_members
         (display_name, username, role_id, department_id, mentor_id, status, kpi, position_title, bio)
         VALUES ($1,$2,$3,$4,$5,'online',50,'New Hunter','Создан автоматически после активации кандидата в CRM.')
         RETURNING id::text`,
        [input.name, username, role.rows[0]?.id ?? null, department.rows[0]?.id ?? null, mentor.rows[0]?.id ?? null],
      )
      memberId = Number(member.rows[0]?.id)
    }
    await addStep(client, runId, "team_profile", "Профиль Team создан", `${input.name} добавлен в Team.`)

    if (memberId) {
      await client.query(
        `INSERT INTO legionhunt_team_activity (member_id,event_type,title,description,metadata)
         VALUES ($1,'workflow','Профиль создан из CRM','Кандидат автоматически переведён в Team.',jsonb_build_object('candidateId',$2))`,
        [memberId, input.candidateId],
      )
    }

    const course = await client.query<{ id: string; title: string }>(
      `SELECT id::text,title FROM legionhunt_academy_courses
       WHERE slug='legionhunt-basics' AND is_published=TRUE LIMIT 1`,
    )
    if (course.rows[0]) {
      await client.query(
        `INSERT INTO legionhunt_academy_progress
         (user_name,course_id,lesson_id,completed,progress_percent)
         SELECT $1,$2,NULL,FALSE,0
         WHERE NOT EXISTS (
           SELECT 1 FROM legionhunt_academy_progress
           WHERE user_name=$1 AND course_id=$2 AND lesson_id IS NULL
         )`,
        [username, Number(course.rows[0].id)],
      )
      await addStep(client, runId, "academy_assign", "Курс Academy назначен", course.rows[0].title)
    } else {
      await client.query(
        `INSERT INTO legionhunt_workflow_steps (run_id,step_key,title,status,detail)
         VALUES ($1,'academy_assign','Курс Academy не найден','skipped','Стартовый курс не опубликован.')`,
        [runId],
      )
    }

    await client.query(
      `INSERT INTO legionhunt_candidate_activity
       (candidate_id,event_type,title,description,created_by)
       VALUES ($1,'workflow','Автоматизация выполнена','Создан Team-профиль и назначено стартовое обучение.','Workflow')`,
      [input.candidateId],
    )
    await addStep(client, runId, "notify", "Уведомление создано", "Событие появилось в Notifications и Analytics.")

    await client.query(
      `UPDATE legionhunt_workflow_runs
       SET status='completed',summary='Кандидат активирован: Team-профиль и Academy подготовлены.',finished_at=NOW()
       WHERE id=$1`,
      [runId],
    )
    await client.query("COMMIT")
    return { skipped: false, runId, memberId }
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
