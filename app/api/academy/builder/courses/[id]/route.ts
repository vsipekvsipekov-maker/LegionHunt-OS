import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET(_:NextRequest,context:{params:Promise<{id:string}>}){
 try{await ensureCrmSchema();const {id}=await context.params;const courseId=Number(id);if(!Number.isFinite(courseId))return NextResponse.json({error:"Некорректный ID."},{status:400});
 const course=await db.query(`SELECT id::int,title,slug,description,category,level,status,cover_emoji AS "coverEmoji",estimated_minutes AS "estimatedMinutes",author,updated_at AS "updatedAt" FROM legionhunt_academy_courses WHERE id=$1`,[courseId]);
 if(!course.rows[0])return NextResponse.json({error:"Курс не найден."},{status:404});
 const modules=await db.query(`SELECT m.id::int,m.title,m.description,m.position,
 COALESCE(json_agg(json_build_object('id',l.id::int,'title',l.title,'summary',l.summary,'content',l.content,'lessonType',l.lesson_type,'durationMinutes',l.duration_minutes,'position',l.position,'isPublished',l.is_published,'wikiArticleId',l.wiki_article_id) ORDER BY l.position) FILTER(WHERE l.id IS NOT NULL),'[]'::json) AS lessons
 FROM legionhunt_academy_modules m LEFT JOIN legionhunt_academy_lessons l ON l.module_id=m.id WHERE m.course_id=$1 GROUP BY m.id ORDER BY m.position`,[courseId]);
 return NextResponse.json({course:course.rows[0],modules:modules.rows})}catch(error){console.error("Builder course GET error:",error);return NextResponse.json({error:"Не удалось загрузить курс."},{status:500})}}

export async function PUT(request:NextRequest,context:{params:Promise<{id:string}>}){
 try{await ensureCrmSchema();const {id}=await context.params;const courseId=Number(id);const b=await request.json() as Record<string,unknown>;
 const status=["draft","published","archived"].includes(String(b.status))?String(b.status):"draft";
 const level=["beginner","intermediate","advanced"].includes(String(b.level))?String(b.level):"beginner";
 const r=await db.query(`UPDATE legionhunt_academy_courses SET title=$2,description=$3,category=$4,level=$5,status=$6,cover_emoji=$7,estimated_minutes=$8,updated_at=NOW() WHERE id=$1 RETURNING id::int,title,status,updated_at AS "updatedAt"`,[courseId,String(b.title||"").trim()||"Без названия",String(b.description||"").trim(),String(b.category||"Основы").trim(),level,status,String(b.coverEmoji||"🎓").trim()||"🎓",Math.max(1,Number(b.estimatedMinutes)||60)]);
 if(!r.rows[0])return NextResponse.json({error:"Курс не найден."},{status:404});return NextResponse.json({course:r.rows[0]})}catch(error){console.error("Builder course PUT error:",error);return NextResponse.json({error:"Не удалось сохранить курс."},{status:500})}}

export async function DELETE(_:NextRequest,context:{params:Promise<{id:string}>}){
 try{await ensureCrmSchema();const {id}=await context.params;await db.query(`UPDATE legionhunt_academy_courses SET status='archived',updated_at=NOW() WHERE id=$1`,[Number(id)]);return NextResponse.json({ok:true})}catch(error){console.error("Builder course DELETE error:",error);return NextResponse.json({error:"Не удалось архивировать курс."},{status:500})}}
