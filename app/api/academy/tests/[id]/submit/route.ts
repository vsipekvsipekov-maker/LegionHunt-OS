import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{await ensureCrmSchema();const {id}=await params;const testId=Number(id);const body=await request.json() as {answers?:number[];userName?:string};const user=body.userName?.trim()||"VSIPEK";
 const test=await db.query(`SELECT questions,passing_score AS "passingScore",max_attempts AS "maxAttempts" FROM legionhunt_academy_tests WHERE id=$1 AND is_published=TRUE`,[testId]);if(!test.rowCount)return NextResponse.json({error:"Тест не найден."},{status:404});
 const attempts=await db.query(`SELECT COUNT(*)::int AS count FROM legionhunt_academy_test_attempts WHERE test_id=$1 AND user_name=$2`,[testId,user]);if(attempts.rows[0].count>=test.rows[0].maxAttempts)return NextResponse.json({error:"Лимит попыток исчерпан."},{status:409});
 const questions=(test.rows[0].questions||[]) as Array<{correctIndex:number;explanation?:string}>;const answers=Array.isArray(body.answers)?body.answers:[];let correct=0;const feedback=questions.map((q,i)=>{const ok=Number(answers[i])===Number(q.correctIndex);if(ok)correct++;return{index:i,correct:ok,correctIndex:q.correctIndex,explanation:q.explanation||""}});const score=questions.length?Math.round(correct/questions.length*100):0;const passed=score>=test.rows[0].passingScore;
 await db.query(`INSERT INTO legionhunt_academy_test_attempts(test_id,user_name,answers,score,passed) VALUES($1,$2,$3::jsonb,$4,$5)`,[testId,user,JSON.stringify(answers),score,passed]);
 return NextResponse.json({ok:true,score,passed,correct,total:questions.length,feedback,attemptsUsed:attempts.rows[0].count+1,maxAttempts:test.rows[0].maxAttempts})}catch(error){console.error("Academy test submit error:",error);return NextResponse.json({error:"Не удалось проверить тест."},{status:500})}}
