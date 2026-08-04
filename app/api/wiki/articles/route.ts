import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"

type Row={id:string;title:string;slug:string;category:string;content:string;excerpt:string;is_favorite:boolean;author:string;created_at:string;updated_at:string}
const map=(r:Row)=>({id:Number(r.id),title:r.title,slug:r.slug,category:r.category,content:r.content,excerpt:r.excerpt,isFavorite:r.is_favorite,author:r.author,createdAt:r.created_at,updatedAt:r.updated_at})
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-zа-яё0-9]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,200)

async function seed(){
 if(process.env.WIKI_AUTO_SEED!=="true") return
 const c=await db.query<{count:string}>("SELECT COUNT(*)::text count FROM legionhunt_wiki_articles")
 if(Number(c.rows[0]?.count||0)>0)return
 await db.query(`INSERT INTO legionhunt_wiki_articles(title,slug,category,excerpt,content,is_favorite) VALUES
 ('Добро пожаловать в LEGION Wiki','welcome-legion-wiki','Старт','Главная страница базы знаний.','# LEGION Wiki\n\nЕдиная база знаний команды.\n\n## Здесь хранятся\n\n- скрипты\n- регламенты\n- обучение\n- ответы на возражения\n- материалы наставников',TRUE),
 ('Возражение «нет опыта»','objection-no-experience','Продажи','Сценарий ответа кандидату без опыта.','# Нет опыта\n\nЭто нормально. Большинство начинает без опыта. Есть обучение, материалы и наставник.',FALSE),
 ('Регламент первого контакта','first-contact','CRM','Как начать диалог с новым кандидатом.','# Первый контакт\n\n1. Проверь анкету.\n2. Обратись по имени.\n3. Задай один понятный вопрос.\n4. Зафиксируй следующее действие.',TRUE)`)
}

export async function GET(req:NextRequest){
 try{
  await ensureCrmSchema(); await seed()
  const q=req.nextUrl.searchParams.get("q")?.trim()||""
  const cat=req.nextUrl.searchParams.get("category")?.trim()||""
  const vals:string[]=[]; const wh:string[]=[]
  if(q){vals.push(`%${q}%`);wh.push(`(title ILIKE $${vals.length} OR content ILIKE $${vals.length} OR excerpt ILIKE $${vals.length})`)}
  if(cat&&cat!=="all"){vals.push(cat);wh.push(`category=$${vals.length}`)}
  const r=await db.query<Row>(`SELECT id::text,title,slug,category,content,excerpt,is_favorite,author,created_at::text,updated_at::text FROM legionhunt_wiki_articles ${wh.length?`WHERE ${wh.join(" AND ")}`:""} ORDER BY is_favorite DESC,updated_at DESC`,vals)
  return NextResponse.json({articles:r.rows.map(map)})
 }catch(e){console.error(e);return NextResponse.json({error:"Не удалось загрузить Wiki."},{status:500})}
}

export async function POST(req:NextRequest){
 try{
  await ensureCrmSchema()
  const b=await req.json() as {title?:string;category?:string;excerpt?:string}
  const title=b.title?.trim()
  if(!title)return NextResponse.json({error:"Название обязательно."},{status:400})
  const slug=`${slugify(title)||"article"}-${Date.now().toString(36)}`
  const r=await db.query<Row>(`INSERT INTO legionhunt_wiki_articles(title,slug,category,excerpt,content) VALUES($1,$2,$3,$4,$5) RETURNING id::text,title,slug,category,content,excerpt,is_favorite,author,created_at::text,updated_at::text`,
   [title,slug,b.category?.trim()||"Общее",b.excerpt?.trim()||"",`# ${title}\n\nНачни писать здесь...`])
  return NextResponse.json({article:map(r.rows[0])},{status:201})
 }catch(e){console.error(e);return NextResponse.json({error:"Не удалось создать статью."},{status:500})}
}