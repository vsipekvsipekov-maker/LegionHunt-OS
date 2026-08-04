import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET(){
  try{
    await ensureCrmSchema()
    const result=await db.query(`
      SELECT c.id::int,c.title,c.slug,c.description,c.category,c.level,c.status,
        c.cover_emoji AS "coverEmoji",c.estimated_minutes AS "estimatedMinutes",c.author,
        COUNT(DISTINCT m.id)::int AS "modulesCount",COUNT(DISTINCT l.id)::int AS "lessonsCount",
        c.updated_at AS "updatedAt"
      FROM legionhunt_academy_courses c
      LEFT JOIN legionhunt_academy_modules m ON m.course_id=c.id
      LEFT JOIN legionhunt_academy_lessons l ON l.module_id=m.id
      GROUP BY c.id ORDER BY c.updated_at DESC,c.id DESC
    `)
    return NextResponse.json({courses:result.rows})
  }catch(error){console.error("Builder courses GET error:",error);return NextResponse.json({error:"Не удалось загрузить курсы Builder."},{status:500})}
}

export async function POST(request:NextRequest){
  try{
    await ensureCrmSchema()
    const body=await request.json() as {title?:string;description?:string;category?:string;level?:string;coverEmoji?:string;estimatedMinutes?:number}
    const title=body.title?.trim()
    if(!title)return NextResponse.json({error:"Название курса обязательно."},{status:400})
    const base=title.toLowerCase().replace(/[^a-zа-яё0-9]+/gi,"-").replace(/^-+|-+$/g,"")||"course"
    const slug=`${base}-${Date.now().toString(36)}`
    const result=await db.query(`INSERT INTO legionhunt_academy_courses
      (title,slug,description,category,level,status,cover_emoji,estimated_minutes)
      VALUES($1,$2,$3,$4,$5,'draft',$6,$7)
      RETURNING id::int,title,slug,status`,[
        title,slug,body.description?.trim()||"",body.category?.trim()||"Основы",
        ["beginner","intermediate","advanced"].includes(body.level||"")?body.level:"beginner",
        body.coverEmoji?.trim()||"🎓",Math.max(1,Number(body.estimatedMinutes)||60)
      ])
    return NextResponse.json({course:result.rows[0]},{status:201})
  }catch(error){console.error("Builder courses POST error:",error);return NextResponse.json({error:"Не удалось создать курс."},{status:500})}
}
