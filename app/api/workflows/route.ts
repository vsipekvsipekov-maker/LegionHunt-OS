import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"
import { runCandidateActivationWorkflow } from "@/lib/workflows"

export async function GET() {
  try {
    await ensureCrmSchema()
    const result = await db.query(`
      SELECT r.id,r.workflow_key AS "workflowKey",r.entity_type AS "entityType",r.entity_id AS "entityId",
             r.status,r.summary,r.started_at AS "startedAt",r.finished_at AS "finishedAt",
             COALESCE(json_agg(json_build_object('id',s.id,'stepKey',s.step_key,'title',s.title,'status',s.status,'detail',s.detail)
               ORDER BY s.id) FILTER (WHERE s.id IS NOT NULL),'[]') AS steps
      FROM legionhunt_workflow_runs r
      LEFT JOIN legionhunt_workflow_steps s ON s.run_id=r.id
      GROUP BY r.id
      ORDER BY r.started_at DESC
      LIMIT 50
    `)
    return NextResponse.json({ runs: result.rows })
  } catch (error) {
    console.error("Workflows GET error:", error)
    return NextResponse.json({ error: "Не удалось загрузить автоматизации." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema()
    const body = (await request.json().catch(() => ({}))) as { candidateId?: number; scan?: boolean }
    const candidates = body.candidateId
      ? await db.query(`SELECT id,name,username,mentor FROM legionhunt_candidates WHERE id=$1 AND status='active'`, [body.candidateId])
      : await db.query(`
          SELECT c.id,c.name,c.username,c.mentor
          FROM legionhunt_candidates c
          WHERE c.status='active'
            AND NOT EXISTS (
              SELECT 1 FROM legionhunt_workflow_runs r
              WHERE r.workflow_key='candidate_activation' AND r.entity_type='candidate'
                AND r.entity_id=c.id AND r.status='completed'
            )
          ORDER BY c.updated_at ASC LIMIT 20
        `)
    const results=[]
    for (const row of candidates.rows) {
      results.push(await runCandidateActivationWorkflow({
        candidateId:Number(row.id),name:row.name,username:row.username,mentor:row.mentor,
      }))
    }
    return NextResponse.json({ ok:true, processed:results.length, results })
  } catch (error) {
    console.error("Workflows POST error:", error)
    return NextResponse.json({ error: "Не удалось запустить автоматизацию." }, { status: 500 })
  }
}
