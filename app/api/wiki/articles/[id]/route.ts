import { NextRequest, NextResponse } from "next/server"
import { db, ensureCrmSchema } from "@/lib/db"
type Row={id:string;title:string;slug:string;category:string;content:string;excerpt:string;is_favorite:boolean;author:string;created_at:string;updated_at:string}
const map=(r:Row)=>({id:Number(r.id),title:r.title,slug:r.slug,category:r.category,content:r.content,excerpt:r.excerpt,isFavorite:r.is_favorite,author:r.author,createdAt:r.created_at,updatedAt:r.updated_at})
export async function PATCH(req:NextRequest,ctx:{params:Promise<{id:string}>}){
 try{
  await ensureCrmSchema();const {id}=await ctx.params;const n=Number(id);const b=await req.json() as {
    title?: string
    category?: string
    content?: string
    excerpt?: string
    isFavorite?: boolean
    changeNote?: string
  }
  const u:string[]=[];const v:Array<string|boolean|number>=[]
  const add=(c:string,x:string|boolean|number)=>{v.push(x);u.push(`${c}=$${v.length}`)}
  if(b.title!==undefined)add("title",b.title.trim());if(b.category!==undefined)add("category",b.category.trim());if(b.content!==undefined)add("content",b.content);if(b.excerpt!==undefined)add("excerpt",b.excerpt.trim());if(b.isFavorite!==undefined)add("is_favorite",b.isFavorite)
  if(!u.length)return NextResponse.json({error:"Нет изменений."},{status:400})

  const previous = await db.query<{
    title: string
    category: string
    excerpt: string
    content: string
    author: string
  }>(
    `SELECT title, category, excerpt, content, author
     FROM legionhunt_wiki_articles
     WHERE id = $1`,
    [n],
  )

  if (!previous.rows[0]) {
    return NextResponse.json({error:"Статья не найдена."},{status:404})
  }

  const versionResult = await db.query<{ next_version: number }>(
    `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
     FROM legionhunt_wiki_versions
     WHERE article_id = $1`,
    [n],
  )

  await db.query(
    `INSERT INTO legionhunt_wiki_versions
      (article_id, version_number, title, category, excerpt, content, author, change_note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      n,
      versionResult.rows[0]?.next_version ?? 1,
      previous.rows[0].title,
      previous.rows[0].category,
      previous.rows[0].excerpt,
      previous.rows[0].content,
      previous.rows[0].author,
      b.changeNote?.trim() || "Изменение статьи",
    ],
  )

  u.push("updated_at=NOW()");v.push(n)
  const r=await db.query<Row>(`UPDATE legionhunt_wiki_articles SET ${u.join(",")} WHERE id=$${v.length} RETURNING id::text,title,slug,category,content,excerpt,is_favorite,author,created_at::text,updated_at::text`,v)
  if(!r.rows[0])return NextResponse.json({error:"Статья не найдена."},{status:404})
  return NextResponse.json({article:map(r.rows[0])})
 }catch(e){console.error(e);return NextResponse.json({error:"Не удалось сохранить статью."},{status:500})}
}
export async function DELETE(_r:NextRequest,ctx:{params:Promise<{id:string}>}){
 try{await ensureCrmSchema();const {id}=await ctx.params;await db.query("DELETE FROM legionhunt_wiki_articles WHERE id=$1",[Number(id)]);return NextResponse.json({ok:true})}
 catch(e){console.error(e);return NextResponse.json({error:"Не удалось удалить статью."},{status:500})}
}