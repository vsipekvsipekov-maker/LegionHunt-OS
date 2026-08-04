import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function GET(request:NextRequest){
 try{await ensureCrmSchema();const user=request.nextUrl.searchParams.get("userName")?.trim()||"VSIPEK";
 const result=await db.query(`SELECT t.id,t.course_id AS "courseId",c.title AS "courseTitle",t.title,t.description,t.passing_score AS "passingScore",t.max_attempts AS "maxAttempts",t.questions,
 (SELECT COUNT(*)::int FROM legionhunt_academy_test_attempts a WHERE a.test_id=t.id AND a.user_name=$1) AS attempts,
 (SELECT MAX(score)::int FROM legionhunt_academy_test_attempts a WHERE a.test_id=t.id AND a.user_name=$1) AS "bestScore",
 EXISTS(SELECT 1 FROM legionhunt_academy_test_attempts a WHERE a.test_id=t.id AND a.user_name=$1 AND a.passed=TRUE) AS passed
 FROM legionhunt_academy_tests t JOIN legionhunt_academy_courses c ON c.id=t.course_id WHERE t.is_published=TRUE ORDER BY c.id,t.id`,[user]);
 return NextResponse.json({tests:result.rows})}catch(error){console.error("Academy tests error:",error);return NextResponse.json({error:"Не удалось загрузить тесты."},{status:500})}}
