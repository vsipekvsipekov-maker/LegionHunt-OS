import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureCrmSchema()
    const { id } = await context.params
    const body = await request.json()
    const text = String(body.body ?? "").trim()
    if (!text) return NextResponse.json({ error: "Введите заметку." }, { status: 400 })
    await db.query(`INSERT INTO legionhunt_team_notes(member_id,author,body) VALUES($1,$2,$3)`,[id,String(body.author ?? "VSIPEK"),text])
    await db.query(`INSERT INTO legionhunt_team_activity(member_id,event_type,title,description) VALUES($1,'note','Добавлена заметка',$2)`,[id,text.slice(0,180)])
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error("Create team note error:", error)
    return NextResponse.json({ error: "Не удалось сохранить заметку." }, { status: 500 })
  }
}
